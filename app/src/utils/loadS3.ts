import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET_NAME = process.env.S3_BUCKET;
const PREFIX = 'cleansed/poll_';
const SUFFIX = '.json';

let cachedPollData: any | null = null;

export async function loadLatestPollData(): Promise<any> {
  if (cachedPollData) {
    return cachedPollData;
  }

  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET environment variable is not set.');
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: PREFIX,
  });

  const listResponse = await s3.send(listCommand);
  const objects = listResponse.Contents;

  if (!objects || objects.length === 0) {
    throw new Error('No poll_*.json files found in the bucket.');
  }

  const pollFiles = objects.filter(obj => obj.Key?.endsWith(SUFFIX));

  if (pollFiles.length === 0) {
    throw new Error('No poll_*.json files found in the cleansed/ directory.');
  }

  const latestFile = pollFiles.sort((a, b) => {
    const dateA = a.LastModified?.getTime() || 0;
    const dateB = b.LastModified?.getTime() || 0;
    return dateB - dateA;
  })[0];

  if (!latestFile.Key) {
    throw new Error('Latest file key is undefined.');
  }

  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: latestFile.Key,
  });

  const getResponse = await s3.send(getCommand);
  const bodyContents = await getResponse.Body?.transformToString();

  if (!bodyContents) {
    throw new Error('Failed to read contents of the latest poll file.');
  }

  cachedPollData = JSON.parse(bodyContents);

  // Print a sample for debugging
  const sample = Array.isArray(cachedPollData)
    ? cachedPollData.slice(0, 3)
    : Object.fromEntries(Object.entries(cachedPollData).slice(0, 3));

  console.log('📊 Sample poll data:\n', JSON.stringify(sample, null, 2));

  return cachedPollData;
}