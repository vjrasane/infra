lxcs = [
  {
    vmid    = 100
    ip      = "192.168.1.80"
    ip6     = "2001:14ba:700e:0c00:1144:dcf2:fdb9:bc00"
    gateway = "192.168.1.1"
    rootfs = {
      size    = "512G"
      storage = "local-zfs"
    }
  },
  {
    vmid    = 101
    ip      = "192.168.1.81"
    ip6     = "2001:14ba:700e:0c00:1144:dcf2:fdb9:bc01"
    gateway = "192.168.1.1"
    rootfs = {
      size    = "512G"
      storage = "local-zfs"
    }
  },
  {
    vmid    = 102
    ip      = "192.168.1.82"
    ip6     = "2001:14ba:700e:0c00:1144:dcf2:fdb9:bc02"
    gateway = "192.168.1.1"
    rootfs = {
      size    = "512G"
      storage = "local-zfs"
    }
  }
]
pm_node_name = "proxmox"
pm_user      = "root"
