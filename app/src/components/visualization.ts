import * as d3 from 'd3';

export interface RawPollRow {
  week: number;
  poll: string;
  rank: number;
  school: string;
  color?: string;
  logos?: string[];
}

interface TeamRank {
  rank: number;
  school: string;
  color?: string;
  logos: string[];
}

interface WeekRanking {
  week: string;
  polls: { ranks: TeamRank[] }[];
}

interface FlattenedTeamRank {
  week: number;
  rank: number;
  school: string;
  color: string;
}

export function renderVisualization(data: RawPollRow[], containerId: string): void {
  const groupedByWeek = d3.groups(data, d => d.week).map(([week, rows]) => ({
    week: String(week),
    polls: [
      {
        ranks: rows.map(r => ({
          rank: r.rank,
          school: r.school,
          color: r.color,
          logos: r.logos ?? [],
        })),
      },
    ],
  }));

  renderGroupedVisualization(groupedByWeek, containerId);
}

function renderGroupedVisualization(data: WeekRanking[], containerId: string): void {
  d3.select(`#${containerId}`).selectAll('*').remove();

  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const width = 640 - margin.left - margin.right;
  const height = 320 - margin.top - margin.bottom;
  const outerWidth = width + margin.left + margin.right;
  const outerHeight = height + margin.top + margin.bottom;

  const svg = d3
    .select(`#${containerId}`)
    .append('svg')
    .attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', 'auto')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const flattenedData = data.flatMap(week =>
    week.polls.flatMap(poll =>
      poll.ranks.map(team => ({
        week: +week.week,
        rank: team.rank,
        school: team.school,
        color: team.color || '#ccc',
      }))
    )
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
    .range([0, width]);

  const yMax = d3.max(flattenedData, d => d.rank) || 25;
  const yScale = d3.scaleLinear().domain([1, yMax]).range([0, height]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.format('d')));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#ccc')
    .text('Week');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Rank');

  const lineGenerator = d3.line<FlattenedTeamRank>()
    .x(d => xScale(d.week))
    .y(d => yScale(d.rank));

  svg.selectAll('.team-line')
    .data(allTeams)
    .enter()
    .append('path')
    .attr('class', 'team-line')
    .attr('d', d => lineGenerator(d.ranks)!)
    .attr('fill', 'none')
    .attr('stroke', d => d.isTop ? d.color : '#444')
    .attr('stroke-width', d => d.isTop ? 2 : 1)
    .attr('opacity', d => d.isTop ? 0.7 : 0.3)
    .attr('stroke-dasharray', function () {
      const length = (this as SVGPathElement).getTotalLength();
      return `${length},${length}`;
    })
    .attr('stroke-dashoffset', function () {
      return (this as SVGPathElement).getTotalLength();
    })
    .transition()
    .duration(1000)
    .attr('stroke-dashoffset', 0);

  const g = svg.selectAll('.team-point')
    .data(flattenedData)
    .enter()
    .append('g')
    .attr('class', 'team-point')
    .attr('transform', d => `translate(${xScale(d.week)},${yScale(d.rank)})`);

  g.append('circle')
    .attr('r', 8)
    .attr('fill', d => topSchools.includes(d.school) ? d.color : '#444')
    .attr('opacity', d => topSchools.includes(d.school) ? 0.95 : 0.3)
    .on('mouseover', function () {
      d3.select(this)
        .raise()
        .transition()
        .duration(150)
        .attr('r', 10);
    })
    .on('mouseout', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 8);
    });

  g.append('text')
    .attr('x', 0)
    .attr('y', 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', '#fff')
    .text(d => d.rank);

  g.append('title')
    .text(d => `${d.school}: Rank ${d.rank}`);
}
