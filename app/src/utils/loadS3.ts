import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const BUCKET_NAME = process.env.S3_BUCKET;
if (!BUCKET_NAME) {
  throw new Error("S3_BUCKET environment variable is not defined");
}

const s3 = new S3Client({ region: "us-east-1" });

interface S3Object {
    Key?: string;
    LastModified?: Date;
    [key: string]: any;
  }

async function getLatestKey(prefix: string): Promise<string> {
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
  );

  if (!response.Contents || response.Contents.length === 0) {
    throw new Error(`No files found for prefix: ${prefix}`);
  }

  const latest = (response.Contents as S3Object[]).sort((a: S3Object, b: S3Object) =>
    (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
  )[0];

  return latest.Key!;
}

async function fetchJsonFromS3(key: string): Promise<any> {
  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );

  const stream = Body as Readable;
  const data = await new Promise<any>((resolve, reject) => {
    let body = "";
    stream.setEncoding("utf-8");
    stream.on("data", (chunk) => (body += chunk));
    stream.on("end", () => resolve(JSON.parse(body)));
    stream.on("error", reject);
  });

  return data;
}

function joinTeamsIntoRankings(rankings: any, teams: any[]): any {
  const teamMap = new Map<string, any>();
  for (const team of teams) {
    teamMap.set(team.school, {
      logos: team.logos,
      color: team.color,
      alternateColor: team.alternateColor,
    });
  }

  for (const poll of rankings.polls || []) {
    for (const rank of poll.ranks || []) {
      const teamInfo = teamMap.get(rank.school);
      if (teamInfo) {
        Object.assign(rank, teamInfo);
      }
    }
  }

  return rankings;
}

export async function loadPollWithTeams() {
  const [rankingsKey, teamsKey] = await Promise.all([
    getLatestKey("rankings_"),
    getLatestKey("teams_"),
  ]);

  const [rankingsJson, teamsJson] = await Promise.all([
    fetchJsonFromS3(rankingsKey),
    fetchJsonFromS3(teamsKey),
  ]);

  return joinTeamsIntoRankings(rankingsJson, teamsJson);
}
