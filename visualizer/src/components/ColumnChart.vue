<template>
    <apexchart v-if="enableChart" type="bar" height="600" :options="chartOptions" :series="series"></apexchart>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { type BenchmarkResult, median } from "@/assets/benchmark";

export default defineComponent({
    name: "ColumnChart",
    components: {
        apexchart: VueApexCharts,
    },
    props: {
        benchmarkResults: {
            type: Array as () => BenchmarkResult[][],
            required: true,
        },
    },
    data() {
        return {
            chartOptions: {
                chart: {
                    type: "bar",
                    height: 600,
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: "55%",
                        borderRadius: 5,
                        borderRadiusApplication: "end",
                        dataLabels: {
                            position: "top", // top, center, bottom
                        },
                    },
                },
                dataLabels: {
                    enabled: true,
                    formatter: function (val: number, opt: any) {
                        return [Math.round(val * 100) / 100 + "s"];
                    },
                    offsetY: -60,
                    style: {
                        fontSize: '12px',
                        colors: ["#304758"],
                    }
                },
                stroke: {
                    show: true,
                    width: 2,
                    colors: ["transparent"],
                },
                xaxis: {
                    categories: [] as string[],
                    title: {
                        text: "configuration of the LDES",
                        style: {
                            fontSize: "16px",
                        },
                    },
                    labels: {
                        style: {
                            fontSize: "16px",
                        },
                    },
                },
                yaxis: {
                    title: {
                        text: "time (seconds)",
                        style: {
                            fontSize: "16px",
                        },
                    },
                    forceNiceScale: true,
                    labels: {
                        formatter: function (val: any) {
                            return Math.round(val) + "s";
                        },
                        style: {
                            fontSize: "16px",
                        },
                    },
                },
                fill: {
                    opacity: 1,
                },
                tooltip: {
                    y: {
                        formatter: function (val: any) {
                            return val + "s";
                        },
                    },
                }, // Light version of colors and then dark version of colors "#008FFB", "#00E396", "#FEB019"
                colors: ["#1d7f63", "#0c573e", "#ffffff", "#a497cb", "#6a4ead", "#ffffff", "#b5772b", "#894916"],
                legend: {
                    fontSize: "16px",
                },
            },
            series: [] as { name: string; data: number[] }[],
            enableChart: true,
            quadsPerSecond: {} as { [key: number]: number },
        };
    },
    watch: {
        benchmarkResults() {
            this.calculateSeries();
        },
    },
    mounted() {
        this.calculateSeries();
    },
    methods: {
        calculateSeries() {
            this.enableChart = false;

            const categories = this.benchmarkResults.map((b) => {
                return b[0].name?.replace('-full-1c', '') || "";
            });

            const data = this.benchmarkResults.map((b) => median(b.map((b) => b.time)));
            const quadsPerSecond = this.benchmarkResults.map((b) => median(b.map((b) => b.quadsThroughput ?? 0)));

            this.chartOptions = {
                ...this.chartOptions,
                xaxis: {
                    ...this.chartOptions.xaxis,
                    categories: categories,
                },
                dataLabels: {
                    ...this.chartOptions.dataLabels,
                    formatter: function (val: number, opt: any) {
                        return [
                            Math.round(val * 100) / 100 + "s",
                            "(" + Math.round(quadsPerSecond[opt.dataPointIndex] * 100) / 100 +
                            " quads/s)"
                        ];
                    },
                },
            };

            this.series = [
                {
                    name: "Time",
                    data: data,
                },
            ];

            setTimeout(() => {
                this.enableChart = true;
            }, 100);
        },
    },
});
</script>

<style scoped></style>
