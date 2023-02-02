import * as aws from '@pulumi/aws';
import { Output } from '@pulumi/pulumi';
import { assignOwner, concatName } from '../utils';
import { cidrGen } from '../utils/cidr';

const ec2Subnet = (vpcId: Output<string>, cidrBlock: string, name: string, az: string) => new aws.ec2.Subnet(`${name}-${az}`, {
  vpcId,
  cidrBlock,
  availabilityZone: az,
  tags: assignOwner({ Name: concatName(`${name}-${az}`) }),
});

interface Subnets {
  pubSubnets: aws.ec2.Subnet[];
  priSubnets: aws.ec2.Subnet[];
}

export const createSubnets = (vpc: aws.ec2.Vpc, azs: string[], cidr: string, cidrDigit: number): Subnets => {
  let cidrGenerator = cidrGen(cidr, cidrDigit);

  // igw for public subnet
  let igw = new aws.ec2.InternetGateway('igw', { vpcId: vpc.id, tags: assignOwner({ Name: concatName('igw') }) });
  let pubToIgwRT = new aws.ec2.RouteTable('pub-to-igw', {
    vpcId: vpc.id,
    routes: [{ cidrBlock: '0.0.0.0/0', gatewayId: igw.id }],
    tags: assignOwner({ Name: concatName('pub-to-igw') }),
  }, { dependsOn: [igw] });

  // public subnet
  let pubSubnets = azs.map(az => {
    let subnet = ec2Subnet(vpc.id, cidrGenerator.next().value, 'subnet-pub', az);
    new aws.ec2.RouteTableAssociation(
      `to-igw-rt-for-pub-${az}`,
      {
        subnetId: subnet.id,
        routeTableId: pubToIgwRT.id,
      }, { dependsOn: [subnet, pubToIgwRT] });
    return subnet;
  });

  // eip, nat for private subnet
  let pubSubnet = pubSubnets[0];
  let eip = new aws.ec2.Eip('eip-for-nat', {
    tags: assignOwner({ Name: concatName('eip-for-nat') }),
  });
  let nat = new aws.ec2.NatGateway('nat-for-pri', {
    subnetId: pubSubnet.id,
    connectivityType: 'public',
    allocationId: eip.allocationId,
    tags: assignOwner({ Name: concatName('nat-for-pri') }),
  }, { dependsOn: [eip, pubSubnet] });

  // private subnet
  let priSubnets = azs.map(az => {
    let priToNatRT = new aws.ec2.RouteTable(`pri-to-nat-${az}`, {
      vpcId: vpc.id,
      routes: [{ cidrBlock: '0.0.0.0/0', natGatewayId: nat.id }],
      tags: assignOwner({ Name: concatName(`pri-to-nat-${az}`) }),
    }, { dependsOn: [nat] });
    let subnet = ec2Subnet(vpc.id, cidrGenerator.next().value, 'subnet-pri', az);
    new aws.ec2.RouteTableAssociation(
      `to-nat-rt-for-pri-${az}`,
      {
        subnetId: subnet.id,
        routeTableId: priToNatRT.id,
      }, { dependsOn: [nat, priToNatRT] });
    return subnet;
  });

  return { pubSubnets, priSubnets };
};
