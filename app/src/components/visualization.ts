import * as d3 from 'd3';

interface WeekRanking {
  week: string;
  polls: { ranks: any[] }[];
}

export function renderVisualization(data: WeekRanking[], containerId: string): void {
  // Clear any existing SVG content in the container
  d3.select(`#${containerId}`).selectAll('*').remove();

  // Set up dimensions and margins
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create an SVG element
  const svg = d3
    .select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Flatten the data to get all teams' ranks by week
  const flattenedData = data.flatMap((week) =>
    week.polls.flatMap((poll) =>
      poll.ranks.map((team) => ({
        week: +week.week,
        rank: team.rank,
        school: team.school,
        color: team.color || '#ccc', // Default to gray if no color is provided
        logo: team.logos[0] || '', // Use the first logo if available
      }))
    )
  );

  // Filter the top 12 teams by rank
  const topTeams = Array.from(
    d3.group(flattenedData, (d) => d.school).entries()
  )
    .map(([school, ranks]) => ({
      school,
      ranks: ranks.sort((a, b) => a.week - b.week), // Sort by week
      color: ranks[0].color, // Use the first color as the team's color
    }))
    .sort((a, b) => d3.min(a.ranks, (d) => d.rank)! - d3.min(b.ranks, (d) => d.rank)!)
    .slice(0, 12); // Take the top 12 teams

  // Set up scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(flattenedData, (d) => d.week) as [number, number])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([1, d3.max(flattenedData, (d) => d.rank) || 25]) // Ranks are usually 1 to 25
    .range([0, height]);

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(data.length).tickFormat(d3.format('d')));

  // Add Y axis
  svg.append('g').call(d3.axisLeft(yScale).ticks(10));

  // Add lines for the top 12 teams
  const lineGenerator = d3
    .line<{ week: number; rank: number }>()
    .x((d) => xScale(d.week))
    .y((d) => yScale(d.rank));

  svg
    .selectAll('.team-line')
    .data(topTeams)
    .enter()
    .append('path')
    .attr('class', 'team-line')
    .attr('d', (d) => lineGenerator(d.ranks)!)
    .attr('fill', 'none')
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', 2)
    .attr('opacity', 0.7);

  // Add points for each team's rank
  const points = svg
    .selectAll('.team-point')
    .data(flattenedData)
    .enter()
    .append('g')
    .attr('class', 'team-point')
    .attr('transform', (d) => `translate(${xScale(d.week)},${yScale(d.rank)})`);

  // Add circles for each point, colored by the team's dominant color
  points
    .append('circle')
    .attr('r', 8)
    .attr('fill', (d) => d.color)
    .attr('stroke', '#000')
    .attr('stroke-width', 1.5);

  // Add images (logos) bordering the points
  points
    .append('image')
    .attr('xlink:href', (d) => d.logo)
    .attr('x', -10)
    .attr('y', -10)
    .attr('width', 20)
    .attr('height', 20)
    .attr('clip-path', 'circle(10px at 10px 10px)'); // Clip the image to a circular shape

  // Add labels for ranks
  points
    .append('text')
    .attr('x', 0)
    .attr('y', -15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#000')
    .text((d) => d.rank);
}