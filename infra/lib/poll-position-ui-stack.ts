import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';

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
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, 'PollPositionUICluster', {
      vpc
    });

    const imageUri = `${process.env.ACCOUNT_ID}.dkr.ecr.${process.env.AWS_REGION}.amazonaws.com/poll-position-ui:latest`;

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'PollPositionUIService', {
      cluster,
      memoryLimitMiB: 256,
      cpu: 256,
      desiredCount: 1,
      publicLoadBalancer: true,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry(imageUri),
        containerPort: 3000,
        environment: {
          VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? '',
          BUILD_TIMESTAMP: process.env.BUILD_TIMESTAMP ?? '',
        },
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'PollPositionUI' }),
      },
    });

    fargateService.taskDefinition.obtainExecutionRole().addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
    );

    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      port: '3000',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: 10,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(300),
      scaleOutCooldown: Duration.seconds(60),
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
    });
  }
}
