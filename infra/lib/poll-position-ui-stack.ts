import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';

export class PollPositionUIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      synthesizer: new cdk.DefaultStackSynthesizer({
        qualifier: 'pollpstn',
      }),
    });

    const commonTags = {
      Project: 'poll-position-ui',
      Environment: process.env.ENVIRONMENT ?? 'development',
      Owner: 'poll-position-team',
      CostCenter: 'engineering',
      Application: 'poll-position-ui',
    };

    cdk.Tags.of(this).add('Project', commonTags.Project);
    cdk.Tags.of(this).add('Environment', commonTags.Environment);
    cdk.Tags.of(this).add('Owner', commonTags.Owner);
    cdk.Tags.of(this).add('CostCenter', commonTags.CostCenter);
    cdk.Tags.of(this).add('Application', commonTags.Application);

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
        logDriver: ecs.LogDrivers.awsLogs({ 
          streamPrefix: 'PollPositionUI',
          logGroup: new logs.LogGroup(this, 'PollPositionUILogGroup', {
            logGroupName: '/ecs/poll-position-ui',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        }),
      },
    });

    fargateService.taskDefinition.obtainExecutionRole().addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
    );

    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      port: '3000',
      healthyHttpCodes: '200',
      interval: Duration.seconds(60),
      timeout: Duration.seconds(15),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    });

    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: 10,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.seconds(600),
      scaleOutCooldown: Duration.seconds(180),
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(600),
      scaleOutCooldown: Duration.seconds(180),
    });

    scalableTarget.scaleOnSchedule('ScaleDownNightly', {
      schedule: applicationautoscaling.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      minCapacity: 0,
      maxCapacity: 0,
    });

    scalableTarget.scaleOnSchedule('ScaleUpMorning', {
      schedule: applicationautoscaling.Schedule.cron({
        minute: '0',
        hour: '8',
        day: '*',
        month: '*',
        year: '*',
      }),
      minCapacity: 0,
      maxCapacity: 10,
    });
  }
}
