import { renderVisualization } from './components/visualization';
import { loadPollWithTeams } from './utils/loadS3';

loadPollWithTeams()
  .then((data) => {
    interface WeekRanking {
      week: string;
      polls: { ranks: any[] }[];
    }

    const transformedData: WeekRanking[] = (data as any[]).map((weekRanking: any): WeekRanking => ({
      ...weekRanking,
      week: weekRanking.week.toString(),
      polls: weekRanking.polls ?? [],
    }));
    renderVisualization(transformedData, 'visualization-container');
  })
  .catch((error) => {
    console.error('Error:', error);
  });

const container = document.createElement('div');
container.id = 'visualization-container';
document.body.appendChild(container);