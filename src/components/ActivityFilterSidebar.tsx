import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

interface FilterState {
    dateRange: DateRange | undefined;
    guestRange: number[];
    tables: number[];
    timeRange: string[];
}

interface ActivityFilterSidebarProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onClearFilters: () => void;
}

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const ActivityFilterSidebar = ({ filters, onFilterChange, onClearFilters }: ActivityFilterSidebarProps) => {
    const [tempGuestRange, setTempGuestRange] = React.useState(filters.guestRange);
    const [tempTimeRange, setTempTimeRange] = React.useState(filters.timeRange);

    const handleGuestRangeChange = (value: number[]) => {
        setTempGuestRange(value);
    };

    const handleGuestRangeCommit = () => {
        onFilterChange({ ...filters, guestRange: tempGuestRange });
    };

    const handleTimeRangeChange = (index: number, value: string) => {
        const newTimeRange = [...tempTimeRange];
        newTimeRange[index] = value;
        setTempTimeRange(newTimeRange);
    };

    const handleTimeRangeCommit = () => {
        onFilterChange({ ...filters, timeRange: tempTimeRange });
    };

    const handleDateRangeChange = (range: DateRange | undefined) => {
        onFilterChange({ ...filters, dateRange: range });
    };

    const handleTableToggle = (tableNumber: number) => {
        const newTables = filters.tables.includes(tableNumber)
            ? filters.tables.filter(t => t !== tableNumber)
            : [...filters.tables, tableNumber];
        onFilterChange({ ...filters, tables: newTables });
    };

    const handleToggleAllTables = () => {
        if (filters.tables.length === ALL_TABLES.length) {
            onFilterChange({ ...filters, tables: [] });
        } else {
            onFilterChange({ ...filters, tables: ALL_TABLES });
        }
    };

    const clearDateFilter = () => {
        onFilterChange({ ...filters, dateRange: undefined });
    };

    const clearGuestFilter = () => {
        setTempGuestRange([1, 20]);
        onFilterChange({ ...filters, guestRange: [1, 20] });
    };

    const clearTableFilter = () => {
        onFilterChange({ ...filters, tables: ALL_TABLES });
    };

    const clearTimeFilter = () => {
        setTempTimeRange(["00:00", "23:59"]);
        onFilterChange({ ...filters, timeRange: ["00:00", "23:59"] });
    };

    const hasActiveFilters =
        filters.dateRange?.from !== undefined ||
        filters.guestRange[0] !== 1 || filters.guestRange[1] !== 20 ||
        filters.tables.length !== ALL_TABLES.length ||
        filters.timeRange[0] !== "00:00" || filters.timeRange[1] !== "23:59";

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white">
                    <Filter className="h-4 w-4" />
                    Filter
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[500px] sm:w-[640px] pt-12" hideCloseButton overlayClassName="bg-black/30">
                <SheetHeader className="mb-8 text-left space-y-0">
                    <SheetTitle className="font-bold text-2xl tracking-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#18181b' }}>
                        Filter Bookings
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100vh-140px)]">
                    {/* Active Filters */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {filters.dateRange?.from && (
                                <Badge variant="secondary" className="gap-2 pr-1">
                                    <span className="text-xs">
                                        Dates: {format(filters.dateRange.from, "dd-MM-yy")} to {filters.dateRange.to ? format(filters.dateRange.to, "dd-MM-yy") : format(filters.dateRange.from, "dd-MM-yy")}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={clearDateFilter}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )}
                            {(filters.guestRange[0] !== 1 || filters.guestRange[1] !== 20) && (
                                <Badge variant="secondary" className="gap-2 pr-1">
                                    <span className="text-xs">
                                        Guests: {filters.guestRange[0]}-{filters.guestRange[1]}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={clearGuestFilter}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )}
                            {filters.tables.length !== ALL_TABLES.length && (
                                <Badge variant="secondary" className="gap-2 pr-1">
                                    <span className="text-xs">
                                        Tables: {filters.tables.length === 0 ? 'None' : filters.tables.sort((a, b) => a - b).join(', ')}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={clearTableFilter}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )}
                            {(filters.timeRange[0] !== "00:00" || filters.timeRange[1] !== "23:59") && (
                                <Badge variant="secondary" className="gap-2 pr-1">
                                    <span className="text-xs">
                                        Time: {filters.timeRange[0]} - {filters.timeRange[1]}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={clearTimeFilter}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 mt-4">
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            <AccordionItem value="date" className="rounded-xl bg-white shadow-sm px-4 border-none">
                                <AccordionTrigger className="hover:no-underline py-4">Date</AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal border-none shadow-none hover:bg-accent",
                                                    !filters.dateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.dateRange?.from ? (
                                                    filters.dateRange.to ? (
                                                        <>
                                                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                                            {format(filters.dateRange.to, "LLL dd, y")}
                                                        </>
                                                    ) : (
                                                        format(filters.dateRange.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Any date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={filters.dateRange?.from}
                                                selected={filters.dateRange}
                                                onSelect={handleDateRangeChange}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="table" className="rounded-xl bg-white shadow-sm px-4 border-none">
                                <AccordionTrigger className="hover:no-underline py-4">Table</AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 pb-2 border-b">
                                            <Checkbox
                                                id="all-tables"
                                                checked={filters.tables.length === ALL_TABLES.length}
                                                onCheckedChange={handleToggleAllTables}
                                            />
                                            <label
                                                htmlFor="all-tables"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                All Tables
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {ALL_TABLES.map(tableNum => (
                                                <div key={tableNum} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`table-${tableNum}`}
                                                        checked={filters.tables.includes(tableNum)}
                                                        onCheckedChange={() => handleTableToggle(tableNum)}
                                                    />
                                                    <label
                                                        htmlFor={`table-${tableNum}`}
                                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        Table {tableNum}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="guests" className="rounded-xl bg-white shadow-sm px-4 border-none">
                                <AccordionTrigger className="hover:no-underline py-4">Guests</AccordionTrigger>
                                <AccordionContent className="pb-4 px-2">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>{tempGuestRange[0]} guests</span>
                                            <span>{tempGuestRange[1]} guests</span>
                                        </div>
                                        <Slider
                                            defaultValue={[1, 20]}
                                            value={tempGuestRange}
                                            max={20}
                                            min={1}
                                            step={1}
                                            onValueChange={handleGuestRangeChange}
                                            onValueCommit={handleGuestRangeCommit}
                                            className="py-4"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="time" className="rounded-xl bg-white shadow-sm px-4 border-none">
                                <AccordionTrigger className="hover:no-underline py-4">Time</AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                                                <Input
                                                    type="time"
                                                    value={tempTimeRange[0]}
                                                    onChange={(e) => handleTimeRangeChange(0, e.target.value)}
                                                    onBlur={handleTimeRangeCommit}
                                                    className="w-full bg-muted/50 border-0 hover:shadow-md focus-visible:shadow-md transition-shadow focus-visible:ring-0"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                                                <Input
                                                    type="time"
                                                    value={tempTimeRange[1]}
                                                    onChange={(e) => handleTimeRangeChange(1, e.target.value)}
                                                    onBlur={handleTimeRangeCommit}
                                                    className="w-full bg-muted/50 border-0 hover:shadow-md focus-visible:shadow-md transition-shadow focus-visible:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <div className="pt-6 mt-auto flex items-center gap-3">
                        <Button variant="outline" className="flex-1 bg-white border-0 hover:shadow-md focus-visible:shadow-md transition-shadow hover:bg-white" onClick={onClearFilters}>
                            Clear All
                        </Button>
                        <SheetClose asChild>
                            <Button className="flex-1">
                                Apply
                            </Button>
                        </SheetClose>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
