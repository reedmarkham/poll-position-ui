import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

// This stack sets up a VPC, ECS cluster, Fargate service, and an ALB for the Poll Position UI.

export class PollPositionUIInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC (public/private subnets across 2 AZs)
    const vpc = new ec2.Vpc(this, 'PollPositionUIVpc', {
      maxAzs: 2,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'PollPositionUICluster', {
      vpc,
    });

    // Docker Image Asset from ../app (your UI directory)
    const imageAsset = new ecr_assets.DockerImageAsset(this, 'PollPositionUIImage', {
      directory: '../app',
    });

    // Fargate Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'PollPositionUITaskDef');

    taskDef.addContainer('PollPositionUIContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(imageAsset),
      portMappings: [{ containerPort: 80 }],
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Fargate Service
    const service = new ecs.FargateService(this, 'PollPositionUIService', {
      cluster,
      taskDefinition: taskDef,
      assignPublicIp: true,
    });

    // Application Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, 'PollPositionUIALB', {
      vpc,
      internetFacing: true,
    });

    // Listener
    const listener = lb.addListener('PollPositionUIListener', {
      port: 80,
      open: true,
    });

    // Attach ECS service to the ALB
    listener.addTargets('PollPositionUITarget', {
      port: 80,
      targets: [service],
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200',
      },
    });

    // Output the public URL
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName,
    });
  }
}