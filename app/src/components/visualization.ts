import * as d3 from 'd3';

export interface RawPollRow {
  week: number;
  poll: string;
  rank: number;
  school: string;
  color?: string;
  logos?: string[];
}

interface FlattenedTeamRank {
  week: number;
  rank: number;
  visualRank: number;
  school: string;
  color: string;
}

function normalizeTiedRanks(data: RawPollRow[]): RawPollRow[] {
  return d3.groups(data, d => d.week).flatMap(([week, rows]) => {
    let visualRank = 1;

    const groupedByRank = d3.groups(rows, d => d.rank).sort((a, b) => a[0] - b[0]);

    return groupedByRank.flatMap(([rank, ties]) => {
      const sorted = ties.sort((a, b) => a.school.localeCompare(b.school));
      return sorted.map(team => ({
        ...team,
        visualRank: visualRank++,
      }));
    });
  });
}

export function renderVisualization(data: RawPollRow[], containerId: string): void {
  const normalized = normalizeTiedRanks(data);

  const groupedByWeek = d3.groups(normalized, d => d.week).map(([week, rows]) => ({
    week: String(week),
    ranks: rows.map(r => ({
      rank: r.rank,
      visualRank: (r as any).visualRank,
      school: r.school,
      color: r.color,
      logos: r.logos ?? [],
    })),
  }));

  renderGroupedVisualization(groupedByWeek, containerId);
}

function renderGroupedVisualization(data: { week: string, ranks: any[] }[], containerId: string): void {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  const svg = container
    .append('svg')
    .style('width', '100%')
    .style('height', '100%')
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g');

  function draw(width: number, height: number) {
    g.selectAll('*').remove();

    const margin = { top: 40, right: 60, bottom: 50, left: 50 }; 
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    g.attr('transform', `translate(${margin.left},${margin.top})`);

    const flattenedData = data.flatMap(week =>
      week.ranks.map(team => ({
        week: +week.week,
        rank: team.rank,
        visualRank: team.visualRank,
        school: team.school,
        color: team.color || '#ccc',
      }))
    );

    const finalWeek = d3.max(flattenedData, d => d.week) ?? 0;
    const topSchools = flattenedData
      .filter(d => d.week === finalWeek)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 12)
      .map(d => d.school);

    const grouped = d3.group(flattenedData, d => d.school);
    const allTeams = Array.from(grouped.entries()).map(([school, ranks]) => ({
      school,
      ranks: ranks.sort((a, b) => a.week - b.week),
      color: ranks[0].color,
      isTop: topSchools.includes(school),
    }));

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(flattenedData, d => d.week) as [number, number])
      .range([0, innerWidth]);

    const yMax = d3.max(flattenedData, d => d.visualRank) || 25;
    const yScale = d3.scaleLinear().domain([1 - 0.5, yMax + 0.5]).range([0, innerHeight]);

    const baseRadius = Math.max(4, width / 120);
    const fontSize = Math.max(8, width / 80);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.format('d')));

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', fontSize)
      .attr('fill', '#ccc')
      .text('Week');

    const lineGenerator = d3.line<FlattenedTeamRank>()
      .defined(d => d.visualRank !== undefined && d.visualRank !== null)
      .x(d => xScale(d.week))
      .y(d => yScale(d.visualRank));

    g.selectAll('.team-line')
      .data(allTeams)
      .enter()
      .append('path')
      .attr('class', 'team-line')
      .attr('d', d => lineGenerator(d.ranks)!)
      .attr('fill', 'none')
      .attr('stroke', d => d.isTop ? d.color : '#444')
      .attr('stroke-width', d => d.isTop ? 2 : 1)
      .attr('opacity', d => d.isTop ? 0.7 : 0.3);

    const points = g.selectAll('.team-point')
      .data(flattenedData)
      .enter()
      .append('g')
      .attr('class', 'team-point')
      .attr('transform', d => `translate(${xScale(d.week)},${yScale(d.visualRank ?? yMax)})`);

    points.append('text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', fontSize)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text(d => d.rank ?? '');

    points.append('circle')
      .attr('r', baseRadius)
      .attr('fill', d => topSchools.includes(d.school) ? d.color : '#444')
      .style('opacity', d => topSchools.includes(d.school) ? 0.95 : 0.3)
      .lower();

    points.append('title')
      .text(d => `${d.school}: Rank ${d.rank}`);
  }

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      const height = width * 0.6;
      draw(width, height);
    }
  });

  const domNode = container.node() as HTMLElement;
  if (domNode) {
    resizeObserver.observe(domNode);
  }
}