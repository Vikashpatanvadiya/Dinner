import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  useListMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem
} from "@workspace/api-client-react";
import { getRestaurantId } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, CheckCircle2, Coffee } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

const PRESET_CATEGORIES = ["Appetizers", "Mains", "Desserts", "Drinks", "Specials"];

export default function Menu() {
  const [, setLocation] = useLocation();
  const restaurantId = getRestaurantId();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);

  if (!restaurantId) {
    setLocation("/restaurant/login");
    return null;
  }

  const { data: menuItems, refetch } = useListMenuItems(restaurantId);
  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "Mains",
      isAvailable: true,
    },
  });

  const onSubmit = (values: MenuItemFormValues) => {
    if (editingItem) {
      updateMutation.mutate(
        { itemId: editingItem, data: values },
        {
          onSuccess: () => {
            refetch();
            setIsAddOpen(false);
            setEditingItem(null);
            toast({ title: "Item updated" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { restaurantId, data: values },
        {
          onSuccess: () => {
            refetch();
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Item added" });
          }
        }
      );
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item.id);
    form.reset({
      name: item.name,
      price: item.price,
      category: item.category,
      isAvailable: item.isAvailable,
    });
    setIsAddOpen(true);
  };

  const handleDelete = (itemId: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(
        { itemId },
        { onSuccess: () => refetch() }
      );
    }
  };

  const toggleAvailability = (itemId: number, currentAvailable: boolean) => {
    updateMutation.mutate(
      { itemId, data: { isAvailable: !currentAvailable } },
      { onSuccess: () => refetch() }
    );
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    form.reset({ name: "", price: 0, category: "Mains", isAvailable: true });
    setIsAddOpen(true);
  };

  // Group items by category
  const categories = Array.from(new Set(menuItems?.map(m => m.category) || []));

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">Manage pre-order items available to customers in queue.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cheeseburger" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRESET_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available for Order</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {menuItems?.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Coffee className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground mb-1">No Menu Items</h3>
            <p className="mb-4">Add your first menu item to allow customers to pre-order while waiting.</p>
            <Button onClick={handleOpenAdd} variant="outline">Create Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h2 className="font-bold text-xl mb-4 pb-2 border-b">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems?.filter(m => m.category === category).map(item => (
                  <Card key={item.id} className={!item.isAvailable ? 'opacity-60 grayscale-[0.5]' : ''}>
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg line-clamp-1" title={item.name}>{item.name}</h3>
                        <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">${item.price.toFixed(2)}</span>
                      </div>
                      
                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={item.isAvailable} 
                            onCheckedChange={() => toggleAvailability(item.id, item.isAvailable)}
                            disabled={updateMutation.isPending}
                          />
                          <Label className="text-xs">{item.isAvailable ? 'Available' : 'Hidden'}</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}