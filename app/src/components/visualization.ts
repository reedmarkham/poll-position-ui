import * as d3 from 'd3';

interface WeekRanking {
  week: string;
  polls: { ranks: TeamRank[] }[];
}

interface TeamRank {
  rank: number;
  school: string;
  color?: string;
  logos: string[];
}

interface FlattenedTeamRank {
  week: number;
  rank: number;
  school: string;
  color: string;
  logo: string;
}

export function renderVisualization(data: WeekRanking[], containerId: string): void {
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

  // Flatten with Array.prototype.flat for type safety
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

  interface TeamLineData {
    school: string;
    ranks: FlattenedTeamRank[];
    color: string;
  }

  const grouped = d3.group(flattenedData, (d: FlattenedTeamRank) => d.school);
  const topTeams: TeamLineData[] = Array.from(
    grouped.entries() as Iterable<[string, FlattenedTeamRank[]]>
  )
    .map(
      ([school, ranks]: [string, FlattenedTeamRank[]]): TeamLineData => ({
        school,
        ranks: ranks.sort((a: FlattenedTeamRank, b: FlattenedTeamRank) => a.week - b.week),
        color: ranks[0].color,
      })
    )
    .sort(
      (a: TeamLineData, b: TeamLineData) =>
        (d3.min(a.ranks, (d: FlattenedTeamRank) => d.rank) ?? Infinity) -
        (d3.min(b.ranks, (d: FlattenedTeamRank) => d.rank) ?? Infinity)
    )
    .slice(0, 12);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(flattenedData, (d: FlattenedTeamRank) => d.week) as [number, number])
    .range([0, width]);

  const yMax = d3.max(flattenedData, (d: FlattenedTeamRank) => d.rank) || 25;
  const yScale = d3.scaleLinear().domain([1, yMax]).range([height, 0]); // invert axis

  // X Axis
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.format('d')));

  // X Axis Label
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Week');

  // Y Axis
  svg.append('g').call(d3.axisLeft(yScale).ticks(10));

  // Y Axis Label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Rank');

  // Line generator
  const lineGenerator = d3
    .line<{ week: number; rank: number }>()
    .x((d: { week: number; rank: number }) => xScale(d.week))
    .y((d: { week: number; rank: number }) => yScale(d.rank));

  svg
    .selectAll('.team-line')
    .data(topTeams)
    .enter()
    .append('path')
    .attr('class', 'team-line')
    .attr('d', (d: TeamLineData) => lineGenerator(d.ranks)!)
    .attr('fill', 'none')
    .attr('stroke', (d: TeamLineData) => d.color)
    .attr('stroke-width', 2)
    .attr('opacity', 0.7);

  const points = svg
    .selectAll('.team-point')
    .data(flattenedData)
    .enter()
    .append('g')
    .attr('class', 'team-point')
    .attr('transform', (d: FlattenedTeamRank) => `translate(${xScale(d.week)},${yScale(d.rank)})`);

  points
    .append('circle')
    .attr('r', 8)
    .attr('fill', (d: FlattenedTeamRank) => d.color)
    .attr('stroke', '#000')
    .attr('stroke-width', 1.5);

  points
    .append('image')
    .attr('xlink:href', (d: FlattenedTeamRank) => d.logo)
    .attr('x', -10)
    .attr('y', -10)
    .attr('width', 20)
    .attr('height', 20);

  points
    .append('text')
    .attr('x', 0)
    .attr('y', -15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#000')
    .text((d: FlattenedTeamRank) => d.rank);

  points
    .append('title') // hover tooltip
    .text((d: FlattenedTeamRank) => `${d.school}: Rank ${d.rank}`);
}
