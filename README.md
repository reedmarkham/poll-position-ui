# 🏈 poll-position-ui

This project deploys a dashboard web app on AWS using d3 to visualize data from [`poll-position`](`https://www.github.com/reedmarkham/poll-position) by connecting to the API it deploys serving data from S3.

http://pollpo-pollp-2ndyfzh7dezn-2006059404.us-east-1.elb.amazonaws.com/

Note that it does not (currently) support a truly responsive layout or mobile usage, but it *should* render nicely on most web browsers.

## Folder Structure

```
poll-position-ui/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions: CI/CD pipeline
├── app/
│   ├── Dockerfile                  # Vite build & static file server (serve)
│   ├── index.html                  # Main HTML entrypoint
│   ├── package.json                # Frontend dependencies
│   ├── src/
│   │   ├── index.ts                # App bootstrap (calls loadLatestPollData)
│   │   ├── vite-env.d.ts           # Vite environment type declarations
│   │   ├── vite.config.ts          # Vite configurations
│   │   ├── components/
│   │   │   └── visualization.ts    # D3 visualization renderer
│   │   └── utils/
│   │       └── loadS3.ts           # S3 fetch + reshape logic
│   └── tsconfig.json              # TypeScript config for frontend
├── infra/
│   ├── bin/
│   │   └── poll-position-ui.ts     # CDK app entrypoint
│   ├── lib/
│   │   └── poll-position-ui-stack.ts  # CDK stack definition (ECS + ALB)
│   ├── package.json                # CDK dependencies
│   ├── cdk.json                    # CDK app config
│   └── tsconfig.json              # TypeScript config for infra
├── README.md
└── .gitignore

```

## Pre-requisites

Ensure these secrets are configured under **Settings > Secrets and variables > Actions > repository secrets** in your GitHub repository:

| Secret Name           | Description                                       |
|-----------------------|---------------------------------------------------|
| `AWS_REGION`          | AWS region for deployment (e.g., `us-east-1`)     |
| `AWS_ACCOUNT_ID`      | Your AWS account ID                               |
| `AWS_ACCESS_KEY_ID`   | AWS access key ID                                 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key                           |

## CI/CD

On commits to `main`:
* GitHub Actions checks out the latest source code and authenticates with AWS using secrets stored in the repository.
* The app’s Docker image is built locally from the app/ directory. This ensures the Vite-based frontend compiles successfully before deploying.
* AWS CDK is used to define and deploy the infrastructure:
    * Builds the Docker image (again) as a DockerImageAsset during deployment.
    * Deploys the image as a Fargate service behind an Application Load Balancer (ALB).