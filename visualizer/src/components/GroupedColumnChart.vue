<template>
    <apexchart v-if="enableChart" type="bar" height="350" :options="chartOptions" :series="series"></apexchart>
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
                    categories: [] as string[],
                    title: {
                        text: "number of members in a page",
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
                    logarithmic: true,
                    logBase: 10,
                    forceNiceScale: true,
                    min: 0.1,
                    labels: {
                        formatter: function(val: any) {
                            if (val === 0) {
                                return "0";
                            }
                            return "10^" + Math.round(Math.log(val) / Math.log(10));
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
        };
    },
    watch: {
        benchmarkResults() {
            this.calculateSeries();
        },
    },
    methods: {
        calculateSeries() {
            this.enableChart = false;
            const groupMembers = [...new Set(this.benchmarkResults.map((b) => b.name.split("-")[0]))];
            const groups = [...new Set(this.benchmarkResults.map((b) => b.name.split("-")[1]))].sort((a, b) => {
                // Only get the number part of the group name with regex
                const aNum = parseInt(a.match(/\d+/)![0]);
                const bNum = parseInt(b.match(/\d+/)![0]);
                return aNum - bNum;
            });

            // Add placeholder every second group. [a, b, c, d, e, f] => [a, b, "", c, d, "", e, f]
            const spacedGroupMembers = [];
            for (let i = 0; i < groupMembers.length; i++) {
                spacedGroupMembers.push(groupMembers[i]);
                if ((i + 1) % 2 === 0) {
                    spacedGroupMembers.push(" ");
                }
            }
            spacedGroupMembers.pop();

            this.series = spacedGroupMembers.map((groupMember) => {
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
                    ...this.chartOptions.xaxis,
                    categories: groups,
                },
            };

            setTimeout(() => {
                this.enableChart = true;
            }, 100);
        },
    },
});
</script>

<style scoped></style>
