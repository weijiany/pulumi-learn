import * as aws from '@pulumi/aws';
import { Config, Output } from '@pulumi/pulumi';
import * as R from 'ramda';

const config = new Config();
const assignOwner = R.mergeLeft(config.getObject('tags') as Record<string, string>);
const concatName = R.concat(config.get('resourceNamePrefix') as string + '-');

const pubSubnet = (vpcId: Output<string>, cidrBlock: string) => {
  let subnet = new aws.ec2.Subnet('subnet-pub', { vpcId, cidrBlock, tags: assignOwner({ Name: concatName('subnet-pub') }) });

  let igw = new aws.ec2.InternetGateway('igw', { vpcId, tags: assignOwner({ Name: concatName('igw') }) });

  let pubToIgwRT = new aws.ec2.RouteTable('pub-to-igw', {
    vpcId,
    routes: [{ cidrBlock: '0.0.0.0/0', gatewayId: igw.id }],
    tags: assignOwner({ Name: concatName('pub-to-igw') }),
  }, { dependsOn: [igw] });

  new aws.ec2.RouteTableAssociation('subnet-pub-to-igw-route-table', {
    subnetId: subnet.id,
    routeTableId: pubToIgwRT.id,
  }, { dependsOn: [subnet, pubToIgwRT] });
};

const priSubnet = (vpcId: Output<string>, cidrBlock: string) => {
  let subnet = new aws.ec2.Subnet('subnet-pri', { vpcId: vpc.id, cidrBlock, tags: assignOwner({ Name: concatName('subnet-pri') }) });

  let eip = new aws.ec2.Eip('eip-for-nat', {
    tags: assignOwner({ Name: concatName('eip-for-nat') }),
  });

  new aws.ec2.NatGateway('nat-for-pri', {
    subnetId: subnet.id,
    connectivityType: 'public',
    allocationId: eip.allocationId,
    tags: assignOwner({ Name: concatName('nat') }),
  }, { dependsOn: [eip, subnet] });
};

let vpc = new aws.ec2.Vpc('vpc', {
  cidrBlock: '10.0.0.0/16',
  tags: assignOwner({ Name: concatName('vpc') }),
});

priSubnet(vpc.id, '10.0.1.0/24');
pubSubnet(vpc.id, '10.0.2.0/24');
