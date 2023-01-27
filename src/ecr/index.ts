import * as aws from '@pulumi/aws';
import { Config } from '@pulumi/pulumi';
import { assignOwner } from '../utils';

const config = new Config();

let ecrNames = config.getObject<string[]>('ecrs') as string[];
ecrNames.forEach(name => new aws.ecr.Repository(`ecr-${name}`, {
  imageScanningConfiguration: {
    scanOnPush: true,
  },
  imageTagMutability: 'MUTABLE',
  tags: assignOwner({}),
  name,
}));
