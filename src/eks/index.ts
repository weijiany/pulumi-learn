import * as aws from '@pulumi/aws';
import * as R from 'ramda';
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

let eksNodeGroupRole = new aws.iam.Role('eks-node-group-role', {
  name: concatName('for-eks-node-group'),
  assumeRolePolicy: {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: 'sts:AssumeRole',
      Principal: { Service: 'ec2.amazonaws.com' },
    }],
  },
  tags: assignOwner({}),
});

R.forEach(policyName => new aws.iam.RolePolicyAttachment(`eks-node-group-role-attachment-${policyName}`, {
  role: eksNodeGroupRole.name,
  policyArn: `arn:aws:iam::aws:policy/${policyName}`,
}))([
  'AmazonEC2ContainerRegistryReadOnly',
  'AmazonEKSWorkerNodePolicy',
  'AmazonEKS_CNI_Policy',
]);

export const eksCluster = (subnets: aws.ec2.Subnet[]) => {
  let subnetIds = subnets.map(R.prop<string>('id'));

  let cluster = new aws.eks.Cluster('eks-cluster', {
    name: concatName('eks'),
    roleArn: eksClusterRole.arn,
    tags: assignOwner({}),
    vpcConfig: {
      subnetIds,
      publicAccessCidrs: ['202.66.38.130/32'],
      endpointPrivateAccess: true,
      endpointPublicAccess: true,
    },
    version: '1.24',
  }, { dependsOn: [eksClusterRole] });

  new aws.eks.Addon('vpc-cni', {
    clusterName: cluster.name,
    addonName: 'vpc-cni',
    addonVersion: 'v1.12.1-eksbuild.2',
    resolveConflicts: 'OVERWRITE',
  });

  new aws.eks.NodeGroup('common-node-group', {
    nodeGroupName: 'common',
    clusterName: cluster.name,
    subnetIds: subnetIds,
    nodeRoleArn: eksNodeGroupRole.arn,
    scalingConfig: {
      desiredSize: 1,
      maxSize: 2,
      minSize: 1,
    },
    updateConfig: {
      maxUnavailable: 1,
    },
    tags: assignOwner({}),
  });
};
