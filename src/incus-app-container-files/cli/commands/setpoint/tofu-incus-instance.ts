import { AbsolutePath } from "../../things/absolute-path.ts";
import { EmptyObject } from "../../things/empty-object.ts";
import { SupportedImageUri } from "../../things/supported-image.ts";

/**
 * Represents an Incus instance, as presented to Tofu.
 *
 * @see https://library.tf/providers/lxc/incus/latest/docs/resources/instance#argument-reference
 */
export type TofuIncusInstance = {
  /** Name of the instance. */
  name: string;
  /**
   * Base image from which the instance will be created. Must specify [an image
   * accessible from the provider
   * remote](https://linuxcontainers.org/incus/docs/main/reference/remote_image_servers/).
   */
  image: SupportedImageUri;
  /** Description of the instance. */
  description?: string;
  /** Instance type. Defaults to `container`. */
  type?: "container" | "virtual-machine";
  /** Whether the instance is ephemeral. Defaults to `false`. */
  ephemeral?: boolean;
  /** Whether the instance should be started (running). Defaults to `true`. */
  running?: boolean;
  /**
   * Whether the provider should wait for the instance to get an IPv4 address
   * before considering the instance as started. If `running` is set to `false`
   * or instance is already running (on update), this value has no effect.
   * Defaults to `true`.
   */
  wait_for_network?: boolean;
  /**
   * List of profiles to apply to the new instance. Profile `default` will be
   * applied if `profiles` is not set (`undefined`). However, if an empty array
   * (`[]`) is set as a value, no profiles will be applied.
   */
  profiles?: string[];
  /**
   * Map of key/value pairs of [instance resources
   * limits](https://linuxcontainers.org/incus/docs/main/reference/instance_options/#resource-limits).
   */
  limits?: Record<string, unknown>;
  /**
   * Map of key/value pairs of [instance config
   * settings](https://linuxcontainers.org/incus/docs/main/reference/instance_options/).
   */
  config?: Record<string, unknown>;
  devices?: TofuIncusDevice<TofuInstanceDeviceType>[];
  files?: TofuIncusFile[];
  /** Name of the project where the instance will be spawned. */
  project?: string;
  /** The remote in which the resource will be created. If not provided, the
   * provider's default remote will be used.
   */
  remote?: string;
  /** Specify a target node in a cluster. */
  target?: string;
};

export type TofuIncusFile =
  & (
    | {
      /** The contents of the file. */
      content: string;
    }
    | {
      /** The source path to a file to copy to the instance. */
      source_path: string;
    }
  )
  & {
    /** The absolute path of the file on the instance, including the filename. */
    target_path: AbsolutePath;
    /** The UID of the file. */
    uid?: number;
    /** The GID of the file. */
    gid?: number;
    /** The octal permissions of the file. Defaults to `"0755"`. */
    mode?: string;
    /**
     * Whether to create the directories leading to the target if they do not
     * exist.
     */
    create_directories?: boolean;
  };

export type TofuInstanceDeviceType =
  | "none"
  | "nic"
  | "disk"
  | "unix-char"
  | "unix-block"
  | "usb"
  | "gpu"
  | "infiniband"
  | "proxy"
  | "unix-hotplug"
  | "tpm"
  | "pci";

export type TofuInstanceDeviceProperties<T extends TofuInstanceDeviceType> =
  T extends "none" ? EmptyObject
    : T extends "nic" ? (
        | {
          nictype: "bridged";
          /** Boot priority for VMs (higher value boots first). */
          "boot.priority"?: number;
          /** The name of the interface inside the host. */
          host_name?: string;
          /** The MAC address of the new interface. */
          hwaddr?: string;
          /** An IPv4 address to assign to the instance through DHCP. (can be `none` to restrict all IPv4 traffic when `security.ipv4_filtering` is set) */
          "ipv4.address"?: string;
          /** Comma-delimited list of IPv4 static routes to add on host to NIC. */
          "ipv4.routes"?: string;
          /** Comma-delimited list of IPv4 static routes to route to the NIC and publish on uplink network (BGP). */
          "ipv4.routes.external"?: string;
          /** An IPv6 address to assign to the instance through DHCP. (can be `none` to restrict all IPv6 traffic when `security.ipv6_filtering` is set) */
          "ipv6.address"?: string;
          /** Comma-delimited list of IPv6 static routes to add on host to NIC. */
          "ipv6.routes"?: string;
          /** Comma-delimited list of IPv6 static routes to route to the NIC and publish on uplink network (BGP). */
          "ipv6.routes.external"?: string;
          /** I/O limit in bit/s for outgoing traffic. (various suffixes supported, see [Units for storage, memory and network limits](https://linuxcontainers.org/incus/docs/main/reference/instance_units/#instances-limit-units)) */
          "limits.egress"?: string;
          /** I/O limit in bit/s for incoming traffic. (various suffixes supported, see [Units for storage, memory and network limits](https://linuxcontainers.org/incus/docs/main/reference/instance_units/#instances-limit-units)) */
          "limits.ingress"?: string;
          /** I/O limit in bit/s for both incoming and outgoing traffic. (same as setting both `limits.ingress` and `limits.egress`) */
          "limits.max"?: string;
          /** The `skb->priority` value (32-bit unsigned integer) for outgoing traffic, to be used by the kernel queuing discipline (qdisc) to prioritize network packets. (The effect of this value depends on the particular qdisc implementation, for example, `SKBPRIO` or `QFQ`. Consult the kernel qdisc documentation before setting this value.) */
          "limits.priority"?: number;
          /** The MTU of the new interface. */
          mtu?: number;
          /** The name of the interface inside the instance. */
          name?: string;
          /** The managed network to link the device to (instead of specifying the `nictype` directly). */
          network?: string;
          /** The name of the host device (required if specifying the `nictype` directly). */
          parent: string;
          /** The transmit queue length for the NIC. */
          "queue.tx.length"?: number;
          /** Prevent the instance from spoofing another instance’s IPv4 address (enables `security.mac_filtering`). */
          "security.ipv4_filtering"?: boolean;
          /** Prevent the instance from spoofing another instance’s IPv6 address (enables `security.mac_filtering`). */
          "security.ipv6_filtering"?: boolean;
          /** Prevent the instance from spoofing another instance’s MAC address. */
          "security.mac_filtering"?: boolean;
          /** Prevent the NIC from communicating with other NICs in the network that have port isolation enabled. */
          "security.port_isolation"?: boolean;
          /** The VLAN ID to use for non-tagged traffic (can be `none` to remove port from default VLAN). */
          vlan?: number | "none";
          /** Comma-delimited list of VLAN IDs or VLAN ranges to join for tagged traffic. */
          "vlan.tagged"?: string;
        }
        | {
          nictype:
            | "macvlan"
            | "sriov"
            | "physical"
            | "ipvlan"
            | "p2p"
            | "routed";
          [key: string]: string | number | boolean;
        }
        | {
          network: string;
        }
      )
    : T extends "disk" ? (
        & {
          "boot.priority"?: number;
          "ceph.cluster_name"?: string;
          "ceph.user_name"?: string;
          [key: `initial.${string}`]: string;
          "io.bus"?:
            | "nvme"
            | "virtio-blk"
            | "virtio-scsi"
            | "9p"
            | "auto"
            | "virtiofs";
          "io.cache"?: "none" | "writeback" | "unsafe" | "metadata";
          path: AbsolutePath;
          pool?: string;
          propagation?:
            | "private"
            | "shared"
            | "slave"
            | "unbindable"
            | "rshared"
            | "rslave"
            | "runbindable"
            | "rprivate";
          "raw.mount.options"?: string;
          readonly?: boolean;
          recursive?: boolean;
          required?: boolean;
          shift?: boolean;
          size?: string;
          "size.state"?: string;
          source: string;
        }
        & (
          | {
            "limits.max"?: string;
          }
          | {
            "limits.read"?: string;
            "limits.write"?: string;
          }
        )
      )
    : Record<string, string>;

export type TofuIncusDevice<T extends TofuInstanceDeviceType> = {
  /** Name of the device. */
  name: string;
  /** Type of the device. */
  type: T;
  properties: TofuInstanceDeviceProperties<T>;
};
