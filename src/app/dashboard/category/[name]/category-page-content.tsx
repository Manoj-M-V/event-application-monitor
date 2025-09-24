"use client"

import { Event, EventCategory } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"
import { EmptyCategoryState } from "./empty-category-state"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { client } from "@/lib/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ArrowUpDown, BarChart, Brain, Loader2, X } from "lucide-react"
import { isAfter, isToday, startOfMonth, startOfWeek } from "date-fns"

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils"
import { Heading } from "@/components/heading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CategoryPageContentProps {
  hasEvents: boolean
  category: EventCategory
}

// Define the expected response type from the backend
interface BusinessInsightsResponse {
  success: boolean
  category: string
  analytics: {
    totalEvents: number
    recentEvents: any[]
    trends?: {
      last30Days: number
      last7Days: number
      dailyAverage: number
      weeklyTrend: 'up' | 'down'
    }
    categoryMetrics?: {
      successRate: number
      failureRate: number
      totalSuccessful: number
      totalFailed: number
    }
  }
  insights: string
  generatedAt: string
  error?: string
  message?: string
}

export const CategoryPageContent = ({
  hasEvents: initialHasEvents,
  category,
}: CategoryPageContentProps) => {
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today")
  const [showInsights, setShowInsights] = useState(false)
  const [insights, setInsights] = useState<BusinessInsightsResponse | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  // https://localhost:3000/dashboard/category/sale?page=5&limit=30
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "30", 10)

  const [pagination, setPagination] = useState({
    pageIndex: page - 1,
    pageSize: limit,
  })

  const { data: pollingData } = useQuery({
    queryKey: ["category", category.name, "hasEvents"],
    initialData: { hasEvents: initialHasEvents },
  })

  const { data, isFetching } = useQuery({
    queryKey: [
      "events",
      category.name,
      pagination.pageIndex,
      pagination.pageSize,
      activeTab,
    ],
    queryFn: async () => {
      const res = await client.category.getEventsByCategoryName.$get({
        name: category.name,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        timeRange: activeTab,
      })

      return await res.json()
    },
    refetchOnWindowFocus: false,
    enabled: pollingData.hasEvents,
  })

  const columns: ColumnDef<Event>[] = useMemo(
    () => [
      {
        accessorKey: "category",
        header: "Category",
        cell: () => <span>{category.name || "Uncategorized"}</span>,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Date
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          return new Date(row.getValue("createdAt")).toLocaleString()
        },
      },
      ...(data?.events[0]
        ? Object.keys(data.events[0].fields as object).map((field) => ({
            accessorFn: (row: Event) =>
              (row.fields as Record<string, any>)[field],
            header: field,
            cell: ({ row }: { row: Row<Event> }) =>
              (row.original.fields as Record<string, any>)[field] || "-",
          }))
        : []),
      {
        accessorKey: "deliveryStatus",
        header: "Delivery Status",
        cell: ({ row }) => (
          <span
            className={cn("px-2 py-1 rounded-full text-xs font-semibold", {
              "bg-green-100 text-green-800":
                row.getValue("deliveryStatus") === "DELIVERED",
              "bg-red-100 text-red-800":
                row.getValue("deliveryStatus") === "FAILED",
              "bg-yellow-100 text-yellow-800":
                row.getValue("deliveryStatus") === "PENDING",
            })}
          >
            {row.getValue("deliveryStatus")}
          </span>
        ),
      },
    ],

    [category.name, data?.events]
  )

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data: data?.events || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.eventsCount || 0) / pagination.pageSize),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  })

  /**
   * Update URL when pagination changes
   */
  const router = useRouter()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set("page", (pagination.pageIndex + 1).toString())
    searchParams.set("limit", pagination.pageSize.toString())
    router.push(`?${searchParams.toString()}`, { scroll: false })
  }, [pagination, router])

  const numericFieldSums = useMemo(() => {
    if (!data?.events || data.events.length === 0) return {}

    const sums: Record<
      string,
      {
        total: number
        thisWeek: number
        thisMonth: number
        today: number
      }
    > = {}

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const monthStart = startOfMonth(now)

    data.events.forEach((event) => {
      const eventDate = event.createdAt

      Object.entries(event.fields as object).forEach(([field, value]) => {
        if (typeof value === "number") {
          if (!sums[field]) {
            sums[field] = { total: 0, thisWeek: 0, thisMonth: 0, today: 0 }
          }

          sums[field].total += value

          if (
            isAfter(eventDate, weekStart) ||
            eventDate.getTime() === weekStart.getTime()
          ) {
            sums[field].thisWeek += value
          }

          if (
            isAfter(eventDate, monthStart) ||
            eventDate.getTime() === monthStart.getTime()
          ) {
            sums[field].thisMonth += value
          }

          if (isToday(eventDate)) {
            sums[field].today += value
          }
        }
      })
    })

    return sums
  }, [data?.events])

  const NumericFieldSumCards = () => {
    if (Object.keys(numericFieldSums).length === 0) return null

    return Object.entries(numericFieldSums).map(([field, sums]) => {
      const relevantSum =
        activeTab === "today"
          ? sums.today
          : activeTab === "week"
          ? sums.thisWeek
          : sums.thisMonth

      return (
        <Card key={field}>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm/6 font-medium">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </p>
            <BarChart className="size-4 text-muted-foreground" />
          </div>

          <div>
            <p className="text-2xl font-bold">{relevantSum.toFixed(2)}</p>
            <p className="text-xs/5 text-muted-foreground">
              {activeTab === "today"
                ? "today"
                : activeTab === "week"
                ? "this week"
                : "this month"}
            </p>
          </div>
        </Card>
      )
    })
  }

  const fetchBusinessInsights = async () => {
    setShowInsights(true)
    setLoadingInsights(true)
    setInsightsError(null)
    
    try {
      const response = await fetch("/api/business-intelligence", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          category: category.name, 
          userId: category.userId,
          timeframe: "30d" // You can make this dynamic based on activeTab
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: BusinessInsightsResponse = await response.json()
      
      if (data.success) {
        setInsights(data)
      } else {
        setInsightsError(data.error || "Failed to generate insights")
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
      setInsightsError(error instanceof Error ? error.message : "Error fetching insights")
    } finally {
      setLoadingInsights(false)
    }
  }

  if (!pollingData.hasEvents) {
    return <EmptyCategoryState categoryName={category.name} />
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as "today" | "week" | "month")
        }}
      >
        <TabsList className="mb-2">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            <Card className="border-2 border-brand-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-sm/6 font-medium">Total Events</p>
                <BarChart className="size-4 text-muted-foreground" />
              </div>

              <div>
                <p className="text-2xl font-bold">{data?.eventsCount || 0}</p>
                <p className="text-xs/5 text-muted-foreground">
                  Events{" "}
                  {activeTab === "today"
                    ? "today"
                    : activeTab === "week"
                    ? "this week"
                    : "this month"}
                </p>
              </div>
            </Card>

            <NumericFieldSumCards />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="w-full flex flex-col gap-4">
            <Heading className="text-3xl">Event overview</Heading>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchBusinessInsights}
            disabled={loadingInsights}
            className="flex items-center gap-2"
          >
            {loadingInsights ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Brain className="size-4" />
            )}
            Get AI Insights
          </Button>
        </div>

        <Card contentClassName="px-6 py-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isFetching ? (
                [...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || isFetching}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isFetching}
        >
          Next
        </Button>
      </div>

      {/* Enhanced Insights Modal */}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-brand-600" />
                <h2 className="text-xl font-semibold">AI Business Intelligence Report</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowInsights(false)}
                className="h-8 w-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-6">
              {loadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="size-8 animate-spin mx-auto mb-4 text-brand-600" />
                    <p className="text-lg font-medium">Generating AI Insights...</p>
                    <p className="text-sm text-muted-foreground">Analyzing your data and market trends</p>
                  </div>
                </div>
              ) : insightsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 bg-red-500 rounded-full"></div>
                    <h3 className="font-medium text-red-800">Error</h3>
                  </div>
                  <p className="text-red-700">{insightsError}</p>
                </div>
              ) : insights ? (
                <div className="space-y-6">
                  {/* Analytics Overview */}
                  <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                    <h3 className="font-semibold text-brand-800 mb-3 flex items-center gap-2">
                      <BarChart className="size-4" />
                      Analytics Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-brand-700">
                          {insights.analytics.totalEvents}
                        </p>
                        <p className="text-sm text-brand-600">Total Events</p>
                      </div>
                      {insights.analytics.trends && (
                        <>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-brand-700">
                              {insights.analytics.trends.last7Days}
                            </p>
                            <p className="text-sm text-brand-600">Last 7 Days</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-brand-700">
                              {insights.analytics.trends.dailyAverage.toFixed(1)}
                            </p>
                            <p className="text-sm text-brand-600">Daily Average</p>
                          </div>
                          <div className="text-center">
                            <div className={cn(
                              "text-2xl font-bold",
                              insights.analytics.trends.weeklyTrend === 'up' 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            )}>
                              {insights.analytics.trends.weeklyTrend === 'up' ? '↗' : '↘'}
                            </div>
                            <p className="text-sm text-brand-600">Trend</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Success Metrics */}
                  {insights.analytics.categoryMetrics && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 mb-3">Performance Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-700">
                            {insights.analytics.categoryMetrics.successRate.toFixed(1)}%
                          </p>
                          <p className="text-sm text-green-600">Success Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-700">
                            {insights.analytics.categoryMetrics.totalSuccessful}
                          </p>
                          <p className="text-sm text-green-600">Successful</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {insights.analytics.categoryMetrics.totalFailed}
                          </p>
                          <p className="text-sm text-red-500">Failed</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Insights Report */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Brain className="size-4" />
                      AI-Generated Business Intelligence Report
                    </h3>
                    <div className="prose max-w-none">
                      <div 
                        className="text-sm leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{ 
                          __html: insights.insights.replace(/\n/g, '<br />') 
                        }}
                      />
                    </div>
                  </div>

                  {/* Report Metadata */}
                  <div className="text-xs text-muted-foreground border-t pt-4">
                    <p>Report generated on {new Date(insights.generatedAt).toLocaleString()}</p>
                    <p>Category: {insights.category}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No insights available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}