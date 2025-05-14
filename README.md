# 🏈 poll-position-ui

This project deploys a UI to visualize data from [`poll-position`](`https://www.github.com/reedmarkham/poll-position) by connecting directly to its S3 bucket.

## Folder Structure

```
poll-position-ui/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions workflow for deploying the UI
├── src/                            # TypeScript source files for the UI
│   ├── components/
│   │   └── visualization.ts        # Encapsulates logic for rendering poll visualizations
│   └── index.ts                    # Main application entry point
├── Dockerfile                      # Dockerfile to containerize the UI app
├── ecs-task-definition.json        # Task definition for ECS deployment
├── index.html                      # Root HTML page for static site rendering
├── package.json                    # NPM dependencies for the UI
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Project documentation
```

## Pre-requisites

Ensure these secrets are configured under **Settings > Secrets and variables > Actions > repository secrets** in your GitHub repository:

| Secret Name           | Description                                       |
|-----------------------|---------------------------------------------------|
| `AWS_REGION`          | AWS region for deployment (e.g., `us-east-1`)     |
| `AWS_ACCOUNT_ID`      | Your AWS account ID                               |
| `AWS_ACCESS_KEY_ID`   | AWS access key ID                                 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key                           |
| `S3_BUCKET`  | AWS S3 bucket containing data |

## CI/CD

This app is built and deployed using GitHub Actions and ECS Fargate. On every commit to the `main` branch, the following actions are triggered:

1. Install dependencies
2. Build the frontend application
3. Build and push the Docker image to Amazon ECR
4. Deploy the UI container to ECS using the task definition