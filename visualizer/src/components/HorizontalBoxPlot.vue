<template>
    <apexchart v-if="enableChart" type="boxPlot" :height="200 + 40 * benchmarkResults.length" :options="chartOptions" :series="series"></apexchart>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import VueApexCharts from "vue3-apexcharts";
import type { BenchmarkResult } from "@/assets/benchmark";

export default defineComponent({
    name: "HorizontalBoxPlot",
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
    },
    data() {
        return {
            chartOptions: {
                chart: {
                    type: 'boxPlot',
                    height: 200 + 40 * this.benchmarkResults.length
                },
                title: {
                    text: this.title,
                    align: 'left',
                    style: {
                        fontSize: "18px",
                    },
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        barHeight: '40%'
                    },
                    boxPlot: {
                        colors: {
                            upper: '#B6C454',
                            lower: '#EDBFB7'
                        }
                    }
                },
                stroke: {
                    colors: ['#333']
                },
                xaxis: {
                    title: {
                        text: "time (milliseconds)",
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
                    labels: {
                        style: {
                            fontSize: "16px",
                        },
                        maxWidth: 200,
                    },
                },
            },
            series: [] as { data: any[] }[],
            enableChart: true,
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

            this.series = [
                {
                    data: this.benchmarkResults.map((b) => ({
                        x: b[0].name?.split(' ')[0],
                        y: this.resultsToMinQ1MedianQ3Max(this.meanReduceArraysToArray(b.map((b) => b.memberArrivalTimes!))),
                    })),
                }
            ];

            console.log(this.series);

            setTimeout(() => {
                this.enableChart = true;
            }, 100);
        },
        meanReduceArraysToArray(arrays: number[][]) {
            const result = [] as number[];
            for (let i = 0; i < arrays[0].length; i++) {
                result.push(Math.round(arrays.reduce((acc, val) => acc + val[i], 0) / arrays.length));
            }
            return result;
        },
        resultsToMinQ1MedianQ3Max(results: number[]) {
            const sorted = results.sort((a, b) => a - b);
            const min = sorted[0];
            const q1 = sorted[Math.floor(sorted.length / 4)];
            const median = sorted[Math.floor(sorted.length / 2)];
            const q3 = sorted[Math.floor(sorted.length * 3 / 4)];
            const max = sorted[sorted.length - 1];
            return [min, q1, median, q3, max];
        },
    },
});
</script>

<style scoped></style>
