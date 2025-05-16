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
  logo: string;
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
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3
    .select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const flattenedData: FlattenedTeamRank[] = data
    .flatMap((week: WeekRanking) =>
      week.polls.flatMap((poll) =>
        poll.ranks.map((team): FlattenedTeamRank => ({
          week: +week.week,
          rank: team.rank,
          school: team.school,
          color: team.color || '#ccc',
          logo: team.logos[0] || '',
        }))
      )
    );

  const grouped = d3.group(flattenedData, (d: FlattenedTeamRank) => d.school);
  const topTeams = Array.from(grouped.entries())
    .map(([school, ranks]) => ({
      school,
      ranks: ranks.sort((a, b) => a.week - b.week),
      color: ranks[0].color,
    }))
    .sort((a, b) => (d3.min(a.ranks, (d) => d.rank) ?? Infinity) - (d3.min(b.ranks, (d) => d.rank) ?? Infinity))
    .slice(0, 12);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(flattenedData, (d) => d.week) as [number, number])
    .range([0, width]);

  const yMax = d3.max(flattenedData, (d) => d.rank) || 25;
  const yScale = d3.scaleLinear().domain([1, yMax]).range([0, height]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.format('d')));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Week');

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(10));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Rank');

  const lineGenerator = d3.line<FlattenedTeamRank>()
    .x((d) => xScale(d.week))
    .y((d) => yScale(d.rank));

  svg.selectAll('.team-line')
    .data(topTeams)
    .enter()
    .append('path')
    .attr('class', 'team-line')
    .attr('d', (d) => lineGenerator(d.ranks)!)
    .attr('fill', 'none')
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', 2)
    .attr('opacity', 0.7)
    .attr('stroke-dasharray', function() {
      const length = (this as SVGPathElement).getTotalLength();
      return `${length},${length}`;
    })
    .attr('stroke-dashoffset', function() {
      return (this as SVGPathElement).getTotalLength();
    })
    .transition()
    .duration(1200)
    .attr('stroke-dashoffset', 0);

  const points = svg.selectAll('.team-point')
    .data(flattenedData)
    .enter()
    .append('g')
    .attr('class', 'team-point')
    .attr('transform', (d) => `translate(${xScale(d.week)},${yScale(d.rank)})`)
    .style('opacity', 0)
    .transition()
    .duration(1000)
    .delay((_, i) => i * 5)
    .style('opacity', 1);

  const g = svg.selectAll<SVGGElement, FlattenedTeamRank>('.team-point');

  g.append('circle')
    .attr('r', 8)
    .attr('fill', (d) => d.color)
    .attr('stroke', '#000')
    .attr('stroke-width', 1.5);

  g.append('image')
    .attr('href', (d) => d.logo)
    .attr('x', -7)
    .attr('y', -7)
    .attr('width', 14)
    .attr('height', 14)
    .style('opacity', 0.9)
    .on('mouseover', function () {
      d3.select(this).transition().duration(200).style('opacity', 1);
    })
    .on('mouseout', function () {
      d3.select(this).transition().duration(200).style('opacity', 0.9);
    });

  g.append('text')
    .attr('x', 0)
    .attr('y', -15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#000')
    .text((d) => d.rank);

  g.append('title')
    .text((d) => `${d.school}: Rank ${d.rank}`);
}
