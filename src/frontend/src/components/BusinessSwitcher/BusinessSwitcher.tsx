import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import type { AppPage } from "@/types/gst";
import { Building2, ChevronDown, PlusCircle, Settings2 } from "lucide-react";

const HUXLEY_FONT =
  '"Huxley Titling", "Cinzel", "Playfair Display", Georgia, serif';

const BIZ_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-teal-500",
];

function getBizColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % BIZ_COLORS.length;
  }
  return BIZ_COLORS[hash];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface BusinessSwitcherProps {
  onNavigate: (page: AppPage) => void;
}

export function BusinessSwitcher({ onNavigate }: BusinessSwitcherProps) {
  const { activeBusiness, businesses, switchBusiness } = useBusinessContext();

  const displayName = activeBusiness?.name ?? "GST Manager Pro";
  const truncatedGstin = activeBusiness?.gstin
    ? `${activeBusiness.gstin.slice(0, 8)}...`
    : "No GSTIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 w-full overflow-hidden hover:opacity-80 transition-opacity group"
          data-ocid="biz_switcher.open_modal_button"
        >
          {activeBusiness?.logo ? (
            <img
              src={activeBusiness.logo}
              alt={displayName}
              className="w-8 h-8 rounded object-contain flex-shrink-0"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                activeBusiness ? getBizColor(activeBusiness.id) : "bg-primary"
              }`}
            >
              {activeBusiness ? (
                getInitials(activeBusiness.name)
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
          )}
          <div className="overflow-hidden min-w-0 flex-1 text-left">
            <p
              className="text-sm font-bold truncate text-sidebar-foreground leading-tight"
              style={{ fontFamily: HUXLEY_FONT, letterSpacing: "0.03em" }}
            >
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {truncatedGstin}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:text-sidebar-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64"
        data-ocid="biz_switcher.dropdown_menu"
      >
        {businesses.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No businesses configured
          </div>
        ) : (
          businesses.map((biz) => (
            <DropdownMenuItem
              key={biz.id}
              onClick={() => switchBusiness(biz.id)}
              className="flex items-center gap-3 cursor-pointer py-2"
              data-ocid="biz_switcher.switch.button"
            >
              {biz.logo ? (
                <img
                  src={biz.logo}
                  alt={biz.name}
                  className="w-7 h-7 rounded object-contain flex-shrink-0"
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getBizColor(
                    biz.id,
                  )}`}
                >
                  {getInitials(biz.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{biz.name}</p>
                {biz.gstin && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {biz.gstin.slice(0, 8)}...
                  </p>
                )}
              </div>
              {biz.id === activeBusiness?.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onNavigate("business-manager")}
          className="flex items-center gap-2 cursor-pointer py-2"
          data-ocid="biz_switcher.add.button"
        >
          <PlusCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Add New Business</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onNavigate("business-manager")}
          className="flex items-center gap-2 cursor-pointer py-2"
          data-ocid="biz_switcher.manage.button"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Manage Businesses</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
