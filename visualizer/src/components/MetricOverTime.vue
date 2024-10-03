<template>
    <apexchart
        class="mt-5"
        type="line"
        width="100%"
        :options="{
            chart: {
                id: id,
            },
            title: {
                text: title,
                align: 'center',
            },
            stroke: {
                width: 1.5,
            },
            xaxis: {
                categories: xAxisCategories(benchmarkResults, stats),
                labels: {
                    show: false,
                },
            },
            yaxis: {
                labels: {
                    formatter: formatter,
                },
                min: 0,
                max:
                    metric === 'cpu'
                        ? Math.max(
                              100,
                              ...benchmarkResults.map((b) => (b[stats] as any).map((s: any) => s[metric])).flat(),
                          )
                        : undefined,
            },
        }"
        :series="
            benchmarkResults.map((b) => ({
                name: b.name,
                data:
                    (b[stats] as any)?.map(
                        (s: any) => s[metric] - (startFromZero ? (b[stats][0] as any)[metric] : 0),
                    ) || [],
            }))
        "
    />
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { BenchmarkStats, Stats, StatsExt } from "@/assets/benchmark";
import VueApexCharts from "vue3-apexcharts";

export default defineComponent({
    name: "MetricOverTime",
    components: {
        apexchart: VueApexCharts,
    },
    props: {
        benchmarkResults: {
            type: Array as () => BenchmarkStats[],
            required: true,
        },
        stats: {
            type: String as PropType<"clientStats" | "serverStats" | "proxyStats">,
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
        metric: {
            type: String as PropType<"cpu" | "memory" | "networkInput" | "networkOutput">,
            required: true,
        },
        formatter: {
            type: Function as PropType<(value: number) => string>,
            default: (value: number) => `${value}`,
        },
        startFromZero: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        xAxisCategories(
            benchmarkResults: { clientStats: Stats[]; serverStats: StatsExt[]; proxyStats: StatsExt[] }[],
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
    },
});
</script>

<style scoped></style>
