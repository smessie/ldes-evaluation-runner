<template>
    <MDBCard>
        <MDBCardHeader>
            <h4>Coefficient of Variation (CV%) {{ benchmarkResultGroup[0].name || "" }}</h4>
        </MDBCardHeader>
        <MDBCardBody>
            <MDBTable>
                <thead class="bg-light">
                    <tr>
                        <th></th>
                        <th>Avg CPU</th>
                        <th>Mean CPU</th>
                        <th>Max CPU</th>
                        <th>Avg Mem</th>
                        <th>Mean Mem</th>
                        <th>Max Mem</th>
                        <th>Net In</th>
                        <th>Net Out</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Client</td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.clientLoad.avgCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.clientLoad.meanCpu)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.clientLoad.maxCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.clientLoad.avgMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.clientLoad.meanMemory),
                                ).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.clientLoad.maxMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Server</td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.serverLoad.avgCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.serverLoad.meanCpu)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.serverLoad.maxCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.serverLoad.avgMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.serverLoad.meanMemory),
                                ).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.serverLoad.maxMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.serverLoad.networkInput!),
                                ).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.serverLoad.networkOutput!),
                                ).toFixed(2)
                            }}%
                        </td>
                    </tr>
                    <tr>
                        <td>Proxy</td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.avgCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.meanCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.maxCpu)).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.avgMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.meanMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(benchmarkResultGroup.map((b) => b.proxyLoad.maxMemory)).toFixed(
                                    2,
                                )
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.proxyLoad.networkInput!),
                                ).toFixed(2)
                            }}%
                        </td>
                        <td>
                            {{
                                coefficientOfVariation(
                                    benchmarkResultGroup.map((b) => b.proxyLoad.networkOutput!),
                                ).toFixed(2)
                            }}%
                        </td>
                    </tr>
                </tbody>
            </MDBTable>
        </MDBCardBody>
    </MDBCard>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MDBCard, MDBCardBody, MDBCardHeader, MDBTable } from "mdb-vue-ui-kit";
import type { BenchmarkResult } from "@/assets/benchmark";

export default defineComponent({
    name: "CoefficientOfVariation",
    components: { MDBCardBody, MDBCard, MDBCardHeader, MDBTable },
    props: {
        benchmarkResultGroup: {
            type: Array as () => BenchmarkResult[],
            required: true,
        },
    },
    methods: {
        coefficientOfVariation(values: number[]) {
            const avg = values.reduce((acc, curr) => acc + curr, 0) / values.length;
            const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
            const avgSquaredDiffs = squaredDiffs.reduce((acc, curr) => acc + curr, 0) / (squaredDiffs.length - 1);
            return (Math.sqrt(avgSquaredDiffs) / avg) * 100;
        },
    },
});
</script>

<style scoped></style>
