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

export const createSubnets = (vpc: aws.ec2.Vpc, azs: string[], cidr: string, cidrDigit: number) => {
  let igw = new aws.ec2.InternetGateway('igw', { vpcId: vpc.id, tags: assignOwner({ Name: concatName('igw') }) });

  let pubToIgwRT = new aws.ec2.RouteTable('pub-to-igw', {
    vpcId: vpc.id,
    routes: [{ cidrBlock: '0.0.0.0/0', gatewayId: igw.id }],
    tags: assignOwner({ Name: concatName('pub-to-igw') }),
  }, { dependsOn: [igw] });

  let gen = cidrGen(cidr, cidrDigit);

  let result: Subnets = {
    pubSubnets: [],
    priSubnets: [],
  };

  azs.forEach(az => {
    // public subnet
    let pubSubnet = ec2Subnet(vpc.id, gen.next().value, 'subnet-pub', az);
    new aws.ec2.RouteTableAssociation(`to-igw-route-table-for-pub-${az}`, {
      subnetId: pubSubnet.id,
      routeTableId: pubToIgwRT.id,
    }, { dependsOn: [pubSubnet, pubToIgwRT] });

    // private subnet
    let priSubnet = ec2Subnet(vpc.id, gen.next().value, 'subnet-pri', az);
    let eip = new aws.ec2.Eip(`eip-for-nat-${az}`, {
      tags: assignOwner({ Name: concatName(`eip-for-nat-${az}`) }),
    });
    new aws.ec2.NatGateway(`nat-for-pri-${az}`, {
      subnetId: priSubnet.id,
      connectivityType: 'public',
      allocationId: eip.allocationId,
      tags: assignOwner({ Name: concatName(`nat-for-pri-${az}`) }),
    }, { dependsOn: [eip, priSubnet] });

    result.pubSubnets.push(pubSubnet);
    result.priSubnets.push(priSubnet);
  });

  return result;
};
