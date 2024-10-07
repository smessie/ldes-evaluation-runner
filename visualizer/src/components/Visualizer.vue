<template>
    <div class="container mt-5 mb-5">
        <h1>LDES Benchmark Results Visualizer</h1>
        <p>Upload one or more benchmark result files to visualize the results.</p>

        <MDBRow>
            <MDBCol md="4">
                <MDBCard>
                    <MDBCardHeader>
                        <h4>Add Benchmark Results</h4>
                    </MDBCardHeader>
                    <MDBCardBody>
                        <MDBFile v-model="files" label="Upload benchmark result file" multiple />
                        <MDBBtn @click="handleFileUpload" color="primary" size="sm" class="mt-3">
                            <MDBIcon fas icon="upload" />
                            Upload
                        </MDBBtn>
                    </MDBCardBody>
                </MDBCard>
            </MDBCol>
            <MDBCol md="8">
                <MDBCard>
                    <MDBCardHeader>
                        <h4>Benchmark Results</h4>
                    </MDBCardHeader>
                    <MDBCardBody>
                        <p v-if="benchmarkResults.length === 0">No benchmark results available.</p>
                        <MDBTable v-else>
                            <thead class="bg-light">
                                <tr>
                                    <th>Benchmark</th>
                                    <th>Runs</th>
                                    <th>Avg time</th>
                                    <th>Avg members throughput</th>
                                    <th>Avg quads throughput</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(benchmarkResult, index) in benchmarkResults" :key="benchmarkResult[0].name">
                                    <td>{{ baseName(benchmarkResult[0].name || "") }}</td>
                                    <td>{{ benchmarkResult.length }}</td>
                                    <td>
                                        {{
                                            (
                                                benchmarkResult
                                                    .map((b) => b.time)
                                                    .reduce((acc, curr) => acc + curr, 0) / benchmarkResult.length
                                            ).toLocaleString("en-US", { maximumFractionDigits: 3 })
                                        }}
                                        s
                                    </td>
                                    <td>
                                        {{
                                            (
                                                benchmarkResult
                                                    .map((b) => b.membersThroughput || 0)
                                                    .reduce((acc, curr) => acc + curr, 0) / benchmarkResult.length
                                            ).toLocaleString("en-US", { maximumFractionDigits: 3 })
                                        }}
                                        members/s
                                    </td>
                                    <td>
                                        {{
                                            (
                                                benchmarkResult
                                                    .map((b) => b.quadsThroughput || 0)
                                                    .reduce((acc, curr) => acc + curr, 0) / benchmarkResult.length
                                            ).toLocaleString("en-US", { maximumFractionDigits: 3 })
                                        }}
                                        quads/s
                                    </td>
                                    <td>
                                        <MDBBtn color="danger" size="sm" @click="removeResult(index)">
                                            <MDBIcon fas icon="trash" />
                                        </MDBBtn>
                                    </td>
                                </tr>
                            </tbody>
                        </MDBTable>
                    </MDBCardBody>
                </MDBCard>
            </MDBCol>
        </MDBRow>
        <MDBRow v-for="benchmarkResultGroup in benchmarkResults" class="mt-5">
            <CoefficientOfVariation :benchmark-result-group="benchmarkResultGroup" />
        </MDBRow>

        <MDBRow v-if="benchmarkResults.length > 0">
            <MDBCol md="12" class="mt-5">
                <MDBSwitch v-model="startNetworkFromZero" label="Start Network from zero" />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="client-cpu-over-time"
                    title="Client CPU Usage Over Time"
                    metric="cpu"
                    stats="clientStats"
                    :benchmark-results="avgStats"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="client-memory-over-time"
                    title="Client Memory Usage Over Time"
                    metric="memory"
                    stats="clientStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="server-cpu-over-time"
                    title="Server CPU Usage Over Time"
                    metric="cpu"
                    stats="serverStats"
                    :benchmark-results="avgStats"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="server-memory-over-time"
                    title="Server Memory Usage Over Time"
                    metric="memory"
                    stats="serverStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="server-network-input-over-time"
                    title="Server Network Input Over Time"
                    metric="networkInput"
                    stats="serverStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXB"
                    :start-from-zero="startNetworkFromZero"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="server-network-output-over-time"
                    title="Server Network Output Over Time"
                    metric="networkOutput"
                    stats="serverStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXB"
                    :start-from-zero="startNetworkFromZero"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="proxy-cpu-over-time"
                    title="Proxy CPU Usage Over Time"
                    metric="cpu"
                    stats="proxyStats"
                    :benchmark-results="avgStats"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="proxy-memory-over-time"
                    title="Proxy Memory Usage Over Time"
                    metric="memory"
                    stats="proxyStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="proxy-network-input-over-time"
                    title="Proxy Network Input Over Time"
                    metric="networkInput"
                    stats="proxyStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXB"
                    :start-from-zero="startNetworkFromZero"
                />
            </MDBCol>
            <MDBCol md="6">
                <MetricOverTime
                    id="proxy-network-output-over-time"
                    title="Proxy Network Output Over Time"
                    metric="networkOutput"
                    stats="proxyStats"
                    :benchmark-results="avgStats"
                    :formatter="bytesToReadableXB"
                    :start-from-zero="startNetworkFromZero"
                />
            </MDBCol>
        </MDBRow>

        <MDBRow v-if="benchmarkResults.length > 1" class="mb-5">
            <MDBCol md="6">
                <BoxPlot
                    id="client-cpu-boxplot"
                    title="Client CPU"
                    metric="avgCpu"
                    load="clientLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="client-memory-boxplot"
                    title="Client Memory"
                    metric="avgMemory"
                    load="clientLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="server-cpu-boxplot"
                    title="Server CPU"
                    metric="avgCpu"
                    load="serverLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="server-memory-boxplot"
                    title="Server Memory"
                    metric="avgMemory"
                    load="serverLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="server-network-input-boxplot"
                    title="Server Network Input"
                    metric="networkInput"
                    load="serverLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="server-network-output-boxplot"
                    title="Server Network Output"
                    metric="networkOutput"
                    load="serverLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="proxy-cpu-boxplot"
                    title="Proxy CPU"
                    metric="avgCpu"
                    load="proxyLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="(value: number) => `${value.toFixed(2)}%`"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="proxy-memory-boxplot"
                    title="Proxy Memory"
                    metric="avgMemory"
                    load="proxyLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXiB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="proxy-network-input-boxplot"
                    title="Proxy Network Input"
                    metric="networkInput"
                    load="proxyLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXB"
                />
            </MDBCol>
            <MDBCol md="6">
                <BoxPlot
                    id="proxy-network-output-boxplot"
                    title="Proxy Network Output"
                    metric="networkOutput"
                    load="proxyLoad"
                    :benchmark-results="benchmarkResults"
                    :formatter="bytesToReadableXB"
                />
            </MDBCol>
        </MDBRow>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
    MDBBtn,
    MDBCard,
    MDBCardBody,
    MDBCardHeader,
    MDBCol,
    MDBContainer,
    MDBFile,
    MDBIcon,
    MDBRow,
    MDBSwitch,
    MDBTable,
} from "mdb-vue-ui-kit";
import { avgStats, type BenchmarkResult, type BenchmarkStats } from "@/assets/benchmark";
import VueApexCharts from "vue3-apexcharts";
import MetricOverTime from "@/components/MetricOverTime.vue";
import CoefficientOfVariation from "@/components/CoefficientOfVariation.vue";
import BoxPlot from "@/components/BoxPlot.vue";

export default defineComponent({
    name: "Visualizer",
    components: {
        BoxPlot,
        CoefficientOfVariation,
        MetricOverTime,
        MDBRow,
        MDBCol,
        MDBContainer,
        MDBBtn,
        MDBIcon,
        MDBFile,
        MDBCard,
        MDBCardHeader,
        MDBCardBody,
        MDBTable,
        apexchart: VueApexCharts,
        MDBSwitch,
    },
    data() {
        return {
            files: [] as File[],
            benchmarkResults: [] as BenchmarkResult[][],
            avgStats: [] as BenchmarkStats[],
            startNetworkFromZero: false,
        };
    },
    methods: {
        handleFileUpload(event: Event) {
            event.preventDefault();
            if (!this.files) {
                return;
            }

            for (const file of this.files) {
                // Read .json file
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    if (typeof result !== "string") {
                        return;
                    }

                    const benchmarkResults = JSON.parse(result) as BenchmarkResult[];
                    // For each benchmark, add name of filename + iteration number if no name is provided
                    // Remove file extension
                    const name =
                        file.name.lastIndexOf(".") > 0 ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;
                    benchmarkResults.forEach((benchmarkResult, index) => {
                        if (!benchmarkResult.name) {
                            benchmarkResult.name = `${name} - it. ${index + 1}`;
                        }
                    });
                    this.benchmarkResults = [...this.benchmarkResults, benchmarkResults];

                    // Calculate average stats
                    this.avgStats = [
                        ...this.avgStats,
                        {
                            name: name,
                            clientStats: avgStats(
                                benchmarkResults.map((b) => b.clientStats).filter((b) => b !== undefined),
                            ),
                            serverStats: avgStats(
                                benchmarkResults.map((b) => b.serverStats).filter((b) => b !== undefined),
                            ),
                            proxyStats: avgStats(
                                benchmarkResults.map((b) => b.proxyStats).filter((b) => b !== undefined),
                            ),
                        },
                    ];

                    console.log(this.benchmarkResults);
                };
                reader.readAsText(file);
            }

            // Clear file input
            this.files = [];
        },
        removeResult(index: number) {
            this.benchmarkResults = this.benchmarkResults.filter((_, i) => i !== index);
        },
        avgCpuOverTime(
            benchmarkResults: BenchmarkResult[],
            stats: "clientStats" | "serverStats" | "proxyStats" = "clientStats",
        ) {
            // Average the different iterations of the same benchmark to one list of values with the average cpu usage at each time point
            const maxTimePoints = Math.max(...benchmarkResults.map((b) => b[stats]?.length || 0));
            const avgCpuUsage = Array(maxTimePoints).fill(0);
            for (let i = 0; i < avgCpuUsage.length; i++) {
                const cpuUsagePerIteration = benchmarkResults
                    .map((b) => b[stats]?.[i]?.cpu)
                    .filter((c) => c !== undefined) as number[];
                avgCpuUsage[i] =
                    cpuUsagePerIteration.reduce((acc, curr) => acc + curr, 0) / cpuUsagePerIteration.length;
            }
            return avgCpuUsage;
        },
        xAxisCategories(
            benchmarkResults: BenchmarkResult[],
            stats: "clientStats" | "serverStats" | "proxyStats" = "clientStats",
        ) {
            // Find the benchmark with the most time points and use that as the x-axis categories
            return Array.from(
                {
                    length: Math.max(...(benchmarkResults.map((b) => b[stats]?.length || 0) || 0)),
                },
                (_, i) => i,
            );
        },
        bytesToReadableXiB(bytes: number) {
            const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
            if (bytes === 0) {
                return "0 B";
            }
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
        },
        bytesToReadableXB(bytes: number) {
            const sizes = ["B", "KB", "MB", "GB", "TB"];
            if (bytes === 0) {
                return "0 B";
            }
            const i = Math.floor(Math.log(bytes) / Math.log(1000));
            return `${(bytes / Math.pow(1000, i)).toFixed(2)} ${sizes[i]}`;
        },
        baseName(name: string): string {
            // Split of ' - it. x' if it exists
            return name.split(" - it. ")[0];
        },
    },
});
</script>

<style scoped>
.fixed {
    background-color: lightgray;
}
</style>
