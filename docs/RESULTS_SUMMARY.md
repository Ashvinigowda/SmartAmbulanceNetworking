# Experimental Results Summary

## Experiments performed

The load experiment contains 30 runs: 2, 5, and 10 sources, with priority OFF and ON, and five trials per configuration.

The access-category experiment contains 15 runs: five trials each for BE, VI, and VO, using 10 sources.

## Mean results for 10 sources

| Metric | BE | VI | VO |
|---|---:|---:|---:|
| Ambulance delay (ms) | 289.993 | 6.314 | 4.355 |
| Ambulance throughput (kbps) | 219.410 | 2100.578 | 2099.644 |
| Ambulance packets received | 887.0 | 8265.8 | 8263.2 |
| Normal packets received | 10596.2 | 8905.6 | 8693.4 |
| Aggregate delivery ratio (%) | 13.974 | 20.890 | 20.632 |

VO reduced mean ambulance delay by 98.50% relative to BE in this configuration.

## Metric definitions

- Delivery ratio = total received packets / total transmitted packets * 100.
- Mean delay = FlowMonitor delay sum / received packets.
- Throughput is calculated from received bytes and the observed flow interval.
- Jitter is calculated from FlowMonitor's jitter sum and received-packet count.
- FlowMonitor's lost-packet count is reported separately from TX minus RX.

## Limitations

The current model uses fixed node positions, a single ad-hoc Wi-Fi network, UDP traffic, and a common receiver. It does not model ambulance mobility, cellular communication, or a dedicated roadside unit.

The results apply to this simulated configuration and are not guarantees of real-world performance.
