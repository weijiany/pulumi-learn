import * as aws from '@pulumi/aws';
import { Output } from '@pulumi/pulumi';
import { assignOwner, concatName } from '../utils';

let eksClusterRole = new aws.iam.Role('eks-cluster-role', {
  name: concatName('for-eks-cluster'),
  assumeRolePolicy: {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: 'sts:AssumeRole',
      Principal: { Service: ['eks.amazonaws.com'] },
    }],
  },
  tags: assignOwner({}),
});

new aws.iam.RolePolicyAttachment('eks-cluster-role-attachment', {
  role: eksClusterRole.name,
  policyArn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy',
});

export const eksCluster = (subnetIds: Output<string>[]) => {
  new aws.eks.Cluster('eks-cluster', {
    name: concatName('eks'),
    roleArn: eksClusterRole.arn,
    tags: assignOwner({}),
    vpcConfig: {
      subnetIds,
      publicAccessCidrs: ['202.66.38.130/32'],
    },
  });
};
