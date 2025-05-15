import { renderVisualization } from './components/visualization';
import { loadLatestPollData } from './utils/loadS3';

interface WeekRanking {
  week: string;
  polls: { ranks: any[] }[];
}

// Create the container first to ensure it exists before rendering
const container = document.createElement('div');
container.id = 'visualization-container';
document.body.appendChild(container);

async function main() {
  try {
    const data = await loadLatestPollData();

    const transformedData: WeekRanking[] = (data as any[]).map((weekRanking: any): WeekRanking => ({
      ...weekRanking,
      week: weekRanking.week.toString(),
      polls: weekRanking.polls ?? [],
    }));

    renderVisualization(transformedData, 'visualization-container');
  } catch (error) {
    console.error('❌ Visualization load failed:', error);
  }
}

main();
