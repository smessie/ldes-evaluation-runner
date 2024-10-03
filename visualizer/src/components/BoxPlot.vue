<template>
    <apexchart
        class="mt-5"
        type="boxPlot"
        width="100%"
        :options="{
            chart: {
                type: 'boxPlot',
                height: 350,
                id: id,
            },
            title: {
                text: title,
                align: 'center',
            },
            plotOptions: {
                boxPlot: {
                    colors: {
                        upper: '#5C4742',
                        lower: '#A5978B',
                    },
                },
            },
            yaxis: {
                labels: {
                    formatter: formatter,
                },
            },
            tooltip: {
                custom: function ({ seriesIndex, dataPointIndex, w }: any) {
                    // Accessing the y property of the data for the box plot
                    const data = w.config.series[seriesIndex].data[dataPointIndex].y;

                    return `
                        <div class='apexcharts-tooltip-boxplot'>
                            <span class='ms-2'><strong>Max:</strong> ${formatter(data[4])}</span><br/>
                            <span class='ms-2'><strong>Q3:</strong> ${formatter(data[3])}</span><br/>
                            <span class='ms-2'><strong>Median:</strong> ${formatter(data[2])}</span><br/>
                            <span class='ms-2'><strong>Q1:</strong> ${formatter(data[1])}</span><br/>
                            <span class='ms-2'><strong>Min:</strong> ${formatter(data[0])}</span>
                        </div>
                        `;
                },
            },
        }"
        :series="[
            {
                name: 'Box Plot',
                data: benchmarkResults.map((b) => ({
                    x: b[0].name,
                    y: [...b.map((b) => b[load][metric])].sort(),
                })),
            },
        ]"
    />
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import VueApexCharts from "vue3-apexcharts";
import type { BenchmarkResult } from "@/assets/benchmark";

export default defineComponent({
    name: "BoxPlot",
    components: {
        apexchart: VueApexCharts,
    },
    props: {
        benchmarkResults: {
            type: Array as () => BenchmarkResult[][],
            required: true,
        },
        id: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        load: {
            type: String as PropType<"clientLoad" | "serverLoad" | "proxyLoad">,
            required: true,
        },
        metric: {
            type: String as PropType<"avgCpu" | "avgMemory" | "networkInput" | "networkOutput">,
            required: true,
        },
        formatter: {
            type: Function as PropType<(value: number) => string>,
            default: (value: number) => `${value}`,
        },
    },
});
</script>

<style scoped></style>
