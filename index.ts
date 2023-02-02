import './src/ecr';
// import './src/iam';
import * as aws from '@pulumi/aws';
import { eksCluster } from './src/eks';
import { createSubnets } from './src/subnet';
import { assignOwner, concatName } from './src/utils';

let vpc = new aws.ec2.Vpc('vpc', {
  cidrBlock: '10.0.0.0/16',
  tags: assignOwner({ Name: concatName('vpc') }),
  enableDnsHostnames: true,
  enableDnsSupport: true,
});

let subnets = createSubnets(vpc, ['ap-east-1a', 'ap-east-1b'], '10.0.0.0/16', 24);

eksCluster(subnets.priSubnets);
