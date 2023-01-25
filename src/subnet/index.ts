import * as aws from '@pulumi/aws';
import { Output } from '@pulumi/pulumi';
import { assignOwner, concatName } from '../utils';


const ec2Subnet = (vpcId: Output<string>, cidrBlock: string, name: string) => new aws.ec2.Subnet(name, {
  vpcId,
  cidrBlock,
  tags: assignOwner({ Name: concatName(name) }),
});

export const pubSubnet = (vpcId: Output<string>, cidrBlock: string) => {
  let subnet = ec2Subnet(vpcId, cidrBlock, 'subnet-pub');

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

export const priSubnet = (vpcId: Output<string>, cidrBlock: string) => {
  let subnet = ec2Subnet(vpcId, cidrBlock, 'subnet-pri');

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
