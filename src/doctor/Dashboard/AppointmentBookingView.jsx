import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/features/ui/select"; // Adjust path as needed
import { CalendarIcon } from 'lucide-react';
import { cn } from "@/shared/lib/utils"; // Adjust path based on your project structure

const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const timesOfDay = Array.from({ length: 18 }, (_, i) => i + 1); // 1 to 18

const generateMockData = (filter) => {
    const today = new Date();
    let startDate, endDate;

    switch (filter) {
        case 'today':
            startDate = today;
            endDate = today;
            break;
        case 'yesterday':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            endDate = new Date(today);
            endDate.setDate(today.getDate() - 1);
            break;
        case 'lastWeek':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = new Date(today);
            endDate.setDate(today.getDate() - 1);
            break;
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        default:
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
    }

    const appointments = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = daysOfWeek[d.getDay() === 0 ? 6 : d.getDay() - 1];
        timesOfDay.forEach(time => {
            const isAvailable = Math.random() > 0.2;
            appointments.push({ day: dayName, time, available: isAvailable });
        });
    }
    return appointments;
};

const AppointmentBookingView = () => {
    const [selectedFilter, setSelectedFilter] = useState('today');
    const [appointments, setAppointments] = useState(generateMockData('today'));

    useEffect(() => {
        setAppointments(generateMockData(selectedFilter));
    }, [selectedFilter]);

    const handleFilterChange = (value) => {
        setSelectedFilter(value);
    };

    const getDayAppointments = (day) => {
        return appointments.filter((appt) => appt.day === day);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-0">
                    Appointment Booking View
                </h1>
                <div className="flex items-center gap-4">
                    <Select onValueChange={handleFilterChange} value={selectedFilter}>
                        <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
                            <SelectValue placeholder="Filter" />
                            <CalendarIcon className="w-4 h-4 ml-2 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground border-border">
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="lastWeek">Last Week</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
                {daysOfWeek.map(day => (
                    <div key={day} className="space-y-2">
                        <h2 className="text-lg font-semibold text-muted-foreground text-center">{day}</h2>
                        <div className="space-y-1">
                            {timesOfDay.map(time => {
                                const dayAppointments = getDayAppointments(day);
                                const appointment = dayAppointments.find((appt) => appt.time === time);
                                const isAvailable = appointment ? appointment.available : false;

                                return (
                                    <div
                                        key={`${day}-${time}`}
                                        className={cn(
                                            "h-10 rounded-md flex items-center justify-center text-sm",
                                            isAvailable
                                                ? "bg-blue-500/20 text-blue-100"
                                                : "bg-gray-200/50 text-gray-400",
                                            "transition-colors duration-200",
                                            "hover:scale-105 transform origin-center",
                                            "border border-transparent",
                                            "hover:border-blue-500/50",
                                            "cursor-pointer"
                                        )}
                                        title={isAvailable ? `Available at ${time}:00` : `Unavailable at ${time}:00`}
                                    >
                                        {isAvailable ? `${time}:00` : ''}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AppointmentBookingView;
