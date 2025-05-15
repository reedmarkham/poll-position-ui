import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';

export class PollPositionUIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      synthesizer: new cdk.DefaultStackSynthesizer({
        qualifier: 'pollpstn',
      }),
    });

    const vpc = new ec2.Vpc(this, 'PollPositionUIVpc', {
      maxAzs: 2,
    });

    const cluster = new ecs.Cluster(this, 'PollPositionUICluster', {
      vpc,
    });

    const imageAsset = new ecr_assets.DockerImageAsset(this, 'PollPositionUIImage', {
      directory: '../app', // adjust as needed
      
    });

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'PollPositionUIService', {
      cluster,
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 1,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(imageAsset),
        containerPort: 3000, // Ensure port alignment
        environment: {
          VITE_S3_BUCKET: process.env.VITE_S3_BUCKET ?? '', // Passed from GitHub Actions
        },
      },
    });

    // Fix health check to expect correct port and path
    fargateService.targetGroup.configureHealthCheck({
      path: '/',                    // or change to '/health' if app exposes one
      port: '3000',                 // must match your app port
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });
  }
}
