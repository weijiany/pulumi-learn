import './src/ecr';
import * as aws from '@pulumi/aws';
import { priSubnet, pubSubnet } from './src/subnet';
import { assignOwner, concatName } from './src/utils';

let vpc = new aws.ec2.Vpc('vpc', {
  cidrBlock: '10.0.0.0/16',
  tags: assignOwner({ Name: concatName('vpc') }),
});

priSubnet(vpc.id, '10.0.1.0/24');
pubSubnet(vpc.id, '10.0.2.0/24');
