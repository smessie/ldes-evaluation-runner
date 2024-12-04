<template>
    <apexchart type="bar" height="350" :options="chartOptions" :series="series"></apexchart>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import VueApexCharts from "vue3-apexcharts";

export default defineComponent({
    name: "GroupedColumnChart",
    components: {
        apexchart: VueApexCharts,
    },
    props: {
        benchmarkResults: {
            type: Array as () => { name: string; time: number }[],
            required: true,
        },
    },
    data() {
        return {
            chartOptions: {
                chart: {
                    type: "bar",
                    height: 350,
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: "55%",
                        borderRadius: 5,
                        borderRadiusApplication: "end",
                    },
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    show: true,
                    width: 2,
                    colors: ["transparent"],
                },
                xaxis: {
                    categories: [...new Set(this.benchmarkResults.map((b) => b.name.split("-")[1]))].sort((a, b) => {
                        // Only get the number part of the group name with regex
                        const aNum = parseInt(a.match(/\d+/)![0]);
                        const bNum = parseInt(b.match(/\d+/)![0]);
                        return aNum - bNum;
                    }),
                },
                yaxis: {
                    title: {
                        text: "time (seconds)",
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
                },
            },
            series: [] as { name: string; data: number[] }[],
        };
    },
    mounted() {
        this.calculateSeries();
    },
    watch: {
        benchmarkResults() {
            this.calculateSeries();
        },
    },
    methods: {
        calculateSeries() {
            const groupMembers = [...new Set(this.benchmarkResults.map((b) => b.name.split("-")[0]))];
            const groups = [...new Set(this.benchmarkResults.map((b) => b.name.split("-")[1]))].sort((a, b) => {
                // Only get the number part of the group name with regex
                const aNum = parseInt(a.match(/\d+/)![0]);
                const bNum = parseInt(b.match(/\d+/)![0]);
                return aNum - bNum;
            });

            this.series = groupMembers.map((groupMember) => {
                return {
                    name: groupMember,
                    data: groups.map((group) => {
                        const benchmark = this.benchmarkResults.find((b) =>
                            b.name.startsWith(`${groupMember}-${group}`),
                        );
                        return benchmark ? benchmark.time : 0;
                    }),
                };
            });

            this.chartOptions = {
                ...this.chartOptions,
                xaxis: {
                    categories: groups,
                },
            };
        },
    },
});
</script>

<style scoped></style>
