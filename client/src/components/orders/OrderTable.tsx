import { useMemo } from "react";
import { useLocation } from "wouter";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ColumnDef, 
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Eye, Edit, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderTableProps {
  orders: any[];
}

export function OrderTable({ orders }: OrderTableProps) {
  const { role } = useAuth();
  const [, setLocation] = useLocation();

  // Define columns based on role
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "orderNumber",
      header: "Order ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("orderNumber")}</div>
      ),
    },
    ...(role !== "customer" ? [
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => {
          // This would normally come from the API with actual customer data
          // For now we'll use placeholder data
          return <div>Sarah Johnson</div>;
        },
      } as ColumnDef<any>
    ] : []),
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items || [];
        return <div>{items.length} items</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={getStatusColor(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"));
        const tax = parseFloat(row.original.tax || "0");
        return <div className="text-right">{formatCurrency(amount + tax)}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        return <div>{formatDate(row.getValue("createdAt"))}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
        
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLocation(`/orders/${order.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                {(role === "admin" || role === "salesperson") && (
                  <DropdownMenuItem onClick={() => setLocation(`/orders/${order.id}?edit=true`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [role, setLocation]);

  return (
    <DataTable
      columns={columns}
      data={orders}
      filterColumn="orderNumber"
      filterPlaceholder="Filter orders..."
    />
  );
}
