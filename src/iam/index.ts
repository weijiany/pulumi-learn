import * as aws from '@pulumi/aws';
import { PolicyStatement } from '@pulumi/aws/iam/documents';
import { assignOwner, concatName } from '../utils';

const githubOIDC = new aws.iam.OpenIdConnectProvider('oid-for-github-action', {
  clientIdLists: ['sts.amazonaws.com'],
  thumbprintLists: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
  url: 'https://token.actions.githubusercontent.com',
  tags: assignOwner({}),
});

const ALLOW_GITHUB_STATEMENT: PolicyStatement = {
  Sid: 'AllowGithub',
  Effect: 'Allow',
  Action: 'sts:AssumeRoleWithWebIdentity',
  Principal: { Federated: githubOIDC.arn },
  Condition: {
    StringLike: { 'token.actions.githubusercontent.com:sub': 'repo:weijiany/*:*' },
  },
};

new aws.iam.RolePolicy('policy-for-github-action', {
  name: concatName('for-github-action'),
  role: new aws.iam.Role('role-for-github-action', {
    name: concatName('for-github-action'),
    assumeRolePolicy: {
      Version: '2012-10-17',
      Statement: [ALLOW_GITHUB_STATEMENT],
    },
    tags: assignOwner({}),
  }),
  policy: {
    Version: '2012-10-17',
    Statement: [{
      Action: [
        // push image permission
        'ecr:CompleteLayerUpload',
        'ecr:GetAuthorizationToken',
        'ecr:UploadLayerPart',
        'ecr:InitiateLayerUpload',
        'ecr:BatchCheckLayerAvailability',
        'ecr:PutImage',
      ],
      Effect: 'Allow',
      Resource: '*',
    }],
  },
}, { dependsOn: [githubOIDC] });
