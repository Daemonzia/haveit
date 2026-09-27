import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock3,
  Users,
  X,
  LogOut,
  PackagePlus,
  CheckCircle2,
  Navigation,
  LoaderCircle,
  SlidersHorizontal,
  CalendarDays,
  UserRound,
  BadgeCheck,
  Inbox,
  Send,
  Check,
  Ban,
  MessageCircle,
  Mail,
  RotateCcw,
  Repeat2,
  Star,
  CreditCard,
  Pencil,
  Bell,
  BellRing,
  Heart,
  History,
  LayoutDashboard,
  ImagePlus,
  Trash2,
  Flag,
  UserX,
  Sparkles,
  ArrowUpDown,
  WalletCards,
  CalendarClock,
  Store,
  Map,
  List,
  Download,
  ShieldAlert,
  RefreshCw,
  ChevronRight,
  Mic,
  ScanLine,
  LocateFixed,
  Clock4,
  Bookmark,
  Share2,
  SearchCheck,
  Home as HomeIcon,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./App.css";

const categories = [
  "All",
  "Tools",
  "Electronics",
  "Kitchen",
  "Sports",
  "Travel",
  "Books",
  "Home",
  "Other",
];

function getCategoryIcon(category) {
  const icons = {
    Tools: "🔧",
    Electronics: "💻",
    Kitchen: "🍳",
    Sports: "🏸",
    Travel: "⛺",
    Books: "📚",
    Home: "🏠",
    Other: "📦",
  };

  return icons[category] || "📦";
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined
  ) {
    return null;
  }

  const earthRadius = 6371;

  const latitudeDifference =
    ((lat2 - lat1) * Math.PI) / 180;

  const longitudeDifference =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function formatDistance(distance) {
  if (distance === null || distance === undefined) {
    return "Distance unavailable";
  }

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m away`;
  }

  return `${distance.toFixed(1)} km away`;
}

async function prepareImageForUpload(file, maxDimension = 1600) {
  if (!file || !file.type.startsWith("image/")) return file;

  // Normalize mobile camera images to JPEG. This avoids HEIC/WebP/container
  // quirks and keeps uploads small and reliable on phones.
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image canvas is unavailable.");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error("Could not prepare the image."));
      }, "image/jpeg", 0.82);
    });

    return new File([blob], "haveit-image.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Image normalization skipped; using original file:", error);
    return file;
  }
}

function getTodayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRequestDate(dateString) {
  if (!dateString) return "Not specified";

  return new Date(dateString).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatInrFromPaise(amountPaise) {
  const amount = Number(amountPaise || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function loadRazorpayCheckoutScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[data-razorpay-checkout="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [nearbyNeeds, setNearbyNeeds] = useState([]);
  const [nearbyNeedsLoading, setNearbyNeedsLoading] = useState(false);

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  const [authOpen, setAuthOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [needOpen, setNeedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestItem, setRequestItem] = useState(null);

  const [requestsOpen, setRequestsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);

  const [authMode, setAuthMode] = useState("login");

  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("haveit_recent_searches") || "[]").slice(0, 6); } catch { return []; }
  });
  const [recentItemIds, setRecentItemIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("haveit_recent_items") || "[]").slice(0, 8); } catch { return []; }
  });
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [distanceFilter, setDistanceFilter] =
    useState("any");

  const [sortBy, setSortBy] = useState("nearest");
  const [lendingFilter, setLendingFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [availableItemIds, setAvailableItemIds] = useState(null);

  const [favoriteIds, setFavoriteIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);

  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [availabilityItem, setAvailabilityItem] = useState(null);
  const [offerNeed, setOfferNeed] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [waitlistedIds, setWaitlistedIds] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length;

  useEffect(() => {
    loadSession();
    loadItems();
    loadNearbyNeeds(null);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);

        if (newSession) {
          loadProfile(newSession.user.id);
          loadFeatureData(newSession.user.id);
        } else {
          setProfile(null);
          setLocation(null);
          setLocationLabel("");
          setFavoriteIds([]);
          setNotifications([]);
          setBlockedUserIds([]);
          setWaitlistedIds([]);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };
    const handleInstalled = () => setInstallPromptEvent(null);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      const dynamicManifestLink = document.createElement("link");
      dynamicManifestLink.rel = "manifest";
      dynamicManifestLink.href = "/manifest.webmanifest";
      dynamicManifestLink.dataset.haveitManifest = "true";
      document.head.appendChild(dynamicManifestLink);
    }
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      document.head.appendChild(themeMeta);
    }
    themeMeta.name = "theme-color";
    themeMeta.content = "#1e3327";

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("HaveIt service worker registration failed:", error);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const refreshTimer = window.setInterval(() => {
      loadNotifications(session.user.id);
      loadWaitlist();
      loadAdminStatus();
    }, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [session]);

  useEffect(() => {
    loadAvailableItemIds();
  }, [searchStartDate, searchEndDate]);

  async function loadSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (currentSession) {
      await loadProfile(currentSession.user.id);
      await loadFeatureData(currentSession.user.id);
    }
  }

  async function loadFeatureData(userId) {
    await Promise.all([
      loadFavorites(userId),
      loadNotifications(userId),
      loadBlockedUsers(userId),
      loadWaitlist(),
      loadAdminStatus(),
    ]);
  }

  async function loadWaitlist() {
    const { data, error } = await supabase.rpc("get_my_waitlist_ids_v1");
    if (error) {
      console.error("Waitlist load error:", error);
      return;
    }
    setWaitlistedIds((data || []).map((row) => row.item_id));
  }

  async function loadAdminStatus() {
    const { data, error } = await supabase.rpc("get_my_admin_status_v1");
    if (error) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(Boolean(data));
  }

  async function toggleWaitlist(itemId) {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }
    const queued = waitlistedIds.includes(itemId);
    const { error } = queued
      ? await supabase.rpc("leave_item_waitlist_v1", { item_id_value: itemId })
      : await supabase.rpc("join_item_waitlist_v1", { item_id_value: itemId });
    if (error) {
      alert(error.message);
      return;
    }
    setWaitlistedIds((current) => queued ? current.filter((id) => id !== itemId) : [...current, itemId]);
    setSuccessMessage(queued ? "Waitlist reminder removed." : "We'll notify you when this item is available again.");
    setTimeout(() => setSuccessMessage(""), 3500);
  }

  async function promptInstallApp() {
    if (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      setSuccessMessage("HaveIt is already installed on this phone.");
      setTimeout(() => setSuccessMessage(""), 3000);
      return;
    }

    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        await installPromptEvent.userChoice;
      } catch (error) {
        console.warn("HaveIt install prompt was dismissed or unavailable:", error);
      }
      setInstallPromptEvent(null);
      return;
    }

    setInstallHelpOpen(true);
  }

  async function loadFavorites(userId) {
    const { data, error } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Favorites load error:", error);
      return;
    }

    setFavoriteIds((data || []).map((row) => row.item_id));
  }

  async function loadNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Notifications load error:", error);
      return;
    }

    setNotifications(data || []);
  }

  async function loadBlockedUsers(userId) {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) {
      console.error("Blocked users load error:", error);
      return;
    }

    setBlockedUserIds((data || []).map((row) => row.blocked_id));
  }

  async function markNotificationRead(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Notification update error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      )
    );
  }

  async function markAllNotificationsRead() {
    if (!session) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", session.user.id)
      .is("read_at", null);

    if (error) {
      console.error("Notifications mark-all error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read_at: notification.read_at || now }))
    );
  }

  async function toggleFavorite(itemId) {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    const isFavorite = favoriteIds.includes(itemId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("item_id", itemId);

      if (error) {
        console.error("Favorite remove error:", error);
        return;
      }

      setFavoriteIds((current) => current.filter((id) => id !== itemId));
      return;
    }

    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: session.user.id, item_id: itemId });

    if (error) {
      console.error("Favorite add error:", error);
      return;
    }

    setFavoriteIds((current) => [...current, itemId]);
  }

  async function blockUser(userId) {
    if (!session || !userId || userId === session.user.id) return;

    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: session.user.id, blocked_id: userId });

    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      console.error("Block user error:", error);
      return;
    }

    setBlockedUserIds((current) =>
      current.includes(userId) ? current : [...current, userId]
    );
  }

  async function unblockUser(userId) {
    if (!session) return;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", session.user.id)
      .eq("blocked_id", userId);

    if (error) {
      console.error("Unblock user error:", error);
      return;
    }

    setBlockedUserIds((current) => current.filter((id) => id !== userId));
  }

  async function submitReport({ targetType, targetId, reason, details, alsoBlock }) {
    if (!session) return false;

    const { error } = await supabase
      .from("reports")
      .insert({
        reporter_id: session.user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details?.trim() || null,
      });

    if (error) {
      console.error("Report submit error:", error);
      return false;
    }

    if (alsoBlock && targetType === "user") {
      await blockUser(targetId);
    }

    setSuccessMessage("Thanks. Your report has been recorded.");
    setTimeout(() => setSuccessMessage(""), 3500);
    return true;
  }

  async function loadAvailableItemIds() {
    if (!searchStartDate || !searchEndDate) {
      setAvailableItemIds(null);
      return;
    }

    if (searchEndDate < searchStartDate) {
      setAvailableItemIds([]);
      return;
    }

    const { data, error } = await supabase.rpc("get_available_item_ids", {
      search_start: searchStartDate,
      search_end: searchEndDate,
    });

    if (error) {
      console.error("Availability filter error:", error);
      setAvailableItemIds(null);
      return;
    }

    setAvailableItemIds((data || []).map((row) => row.item_id));
  }

  async function refreshItemsAndNeeds() {
    await Promise.all([loadItems(), loadNearbyNeeds(location)]);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile load error:", error);
      return;
    }

    setProfile(data);

    if (
      data.latitude !== null &&
      data.longitude !== null
    ) {
      setLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });
      resolveLocationLabel(data.latitude, data.longitude).then((label) => {
        if (label) setLocationLabel(label);
      });
    }
  }

  async function loadItems() {
    setItemsLoading(true);

    let query = supabase
      .from("items")
      .select("*")
      .eq("is_available", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Items load error:", error);
      setItems([]);
    } else {
      setItems(data || []);
    }

    setItemsLoading(false);
  }


  async function loadNearbyNeeds(currentLocation) {
    setNearbyNeedsLoading(true);

    const { data, error } = await supabase.rpc("get_open_nearby_needs_v2", {
      viewer_lat: currentLocation?.latitude ?? null,
      viewer_lon: currentLocation?.longitude ?? null,
    });

    if (error) {
      console.error("Nearby needs load error:", error);
      setNearbyNeeds([]);
    } else {
      setNearbyNeeds(data || []);
    }

    setNearbyNeedsLoading(false);
  }

  async function resolveLocationLabel(latitude, longitude) {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`
      );
      if (!response.ok) return "";
      const data = await response.json();
      const locality = data.locality || data.city || data.localityInfo?.administrative?.[2]?.name || "";
      const region = data.principalSubdivision || "";
      return [locality, region]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(", ");
    } catch (error) {
      console.warn("Location name lookup failed:", error);
      return "";
    }
  }

  function requestLocation() {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const { error } = await supabase
          .from("profiles")
          .update({
            latitude,
            longitude,
          })
          .eq("id", session.user.id);

        if (error) {
          console.error("Location save error:", error);

          setLocationMessage(
            "We found your location but couldn't save it."
          );
        } else {
          setLocation({
            latitude,
            longitude,
          });

          const resolvedLabel = await resolveLocationLabel(latitude, longitude);
          setLocationLabel(resolvedLabel || "Current location");

          loadNearbyNeeds({ latitude, longitude });

          setProfile((current) =>
            current
              ? {
                  ...current,
                  latitude,
                  longitude,
                }
              : current
          );

          setLocationMessage(
            resolvedLabel
              ? `Current location: ${resolvedLabel}`
              : "Current location updated. Nearby results are now sorted for you."
          );
        }

        setLocationLoading(false);
      },
      (error) => {
        console.error("Location error:", error);

        if (error.code === 1) {
          setLocationMessage(
            "Location permission was denied."
          );
        } else {
          setLocationMessage(
            "We couldn't get your location. Please try again."
          );
        }

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  function openListItem() {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setAddItemOpen(true);
  }

  function openNeed() {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setNeedOpen(true);
  }

  function openRequests() {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setRequestsOpen(true);
  }

  function openProfile() {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setProfileOpen(true);
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setLocation(null);
  }

  function getItemDistance(item) {
    if (
      location &&
      item.latitude !== null &&
      item.latitude !== undefined &&
      item.longitude !== null &&
      item.longitude !== undefined
    ) {
      return calculateDistance(
        location.latitude,
        location.longitude,
        item.latitude,
        item.longitude
      );
    }

    return null;
  }

  function handleItemClick(item) {
    rememberItem(item.id);
    setSelectedItem(item);
  }

  function handleRequestClick(item) {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    if (item.owner_id === session.user.id) {
      alert("You can't request your own item.");
      return;
    }

    setSelectedItem(null);
    setRequestItem(item);
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    let result = items
      .filter((item) => item.is_available !== false)
      .filter((item) => !blockedUserIds.includes(item.owner_id))
      .map((item) => ({ ...item, calculatedDistance: getItemDistance(item) }));

    if (availableItemIds) {
      const allowed = new Set(availableItemIds);
      result = result.filter((item) => allowed.has(item.id));
    }

    if (normalizedSearch) {
      result = result.filter((item) => {
        const searchableText = [item.name, item.description, item.category, item.condition]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(normalizedSearch);
      });
    }

    if (selectedCategory !== "All") {
      result = result.filter((item) => item.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (distanceFilter !== "any") {
      const maxDistance = Number(distanceFilter);
      result = result.filter(
        (item) => item.calculatedDistance !== null && item.calculatedDistance <= maxDistance
      );
    }

    if (lendingFilter !== "all") {
      result = result.filter((item) => item.lending_type === lendingFilter);
    }

    if (conditionFilter !== "all") {
      result = result.filter((item) => item.condition === conditionFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === "price_low") {
        return Number(a.price_per_day || 0) - Number(b.price_per_day || 0);
      }
      if (sortBy === "price_high") {
        return Number(b.price_per_day || 0) - Number(a.price_per_day || 0);
      }
      if (a.calculatedDistance !== null && b.calculatedDistance !== null) {
        return a.calculatedDistance - b.calculatedDistance;
      }
      if (a.calculatedDistance !== null) return -1;
      if (b.calculatedDistance !== null) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return result;
  }, [
    items,
    location,
    searchQuery,
    selectedCategory,
    distanceFilter,
    lendingFilter,
    conditionFilter,
    sortBy,
    blockedUserIds,
    availableItemIds,
  ]);

  const recommendedItems = useMemo(() => {
    const favoriteCategoryCounts = new globalThis.Map();

    items
      .filter((item) => favoriteIds.includes(item.id))
      .forEach((item) => {
        const key = item.category || "Other";
        favoriteCategoryCounts.set(key, (favoriteCategoryCounts.get(key) || 0) + 1);
      });

    return items
      .filter((item) => item.is_available !== false)
      .filter((item) => !blockedUserIds.includes(item.owner_id))
      .filter((item) => !session || item.owner_id !== session.user.id)
      .filter((item) => !favoriteIds.includes(item.id))
      .map((item) => {
        const distance = getItemDistance(item);
        const categoryWeight = favoriteCategoryCounts.get(item.category || "Other") || 0;
        return { ...item, calculatedDistance: distance, recommendationScore: categoryWeight * 10 + (distance == null ? 0 : Math.max(0, 6 - distance)) };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6);
  }, [items, favoriteIds, blockedUserIds, session, location]);

  const matchingNeedPairs = useMemo(() => {
    if (!nearbyNeeds.length || !items.length) return [];
    const normalized = (value) => String(value || "").toLowerCase().split(/\s+/).filter((part) => part.length > 2);
    const pairs = [];

    nearbyNeeds.forEach((need) => {
      const needWords = new Set([...normalized(need.item_name), ...normalized(need.category)]);
      const match = items
        .filter((item) => item.is_available !== false)
        .filter((item) => !blockedUserIds.includes(item.owner_id))
        .filter((item) => session && item.owner_id === session.user.id)
        .map((item) => {
          const itemWords = [...normalized(item.name), ...normalized(item.category), ...normalized(item.description)];
          const score = itemWords.reduce((total, word) => total + (needWords.has(word) ? 1 : 0), 0);
          return { item, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)[0];

      if (match) pairs.push({ need, item: match.item });
    });

    return pairs.slice(0, 6);
  }, [nearbyNeeds, items, blockedUserIds, session]);

  function rememberSearch(value) {
    const cleaned = String(value || "").trim();
    if (!cleaned) return;
    const next = [cleaned, ...recentSearches.filter((entry) => entry.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try { localStorage.setItem("haveit_recent_searches", JSON.stringify(next)); } catch {}
  }

  function rememberItem(itemId) {
    if (!itemId) return;
    const next = [itemId, ...recentItemIds.filter((id) => id !== itemId)].slice(0, 8);
    setRecentItemIds(next);
    try { localStorage.setItem("haveit_recent_items", JSON.stringify(next)); } catch {}
  }

  function submitSearch() {
    rememberSearch(searchQuery);
    setSearchFocused(false);
    document.querySelector(".items-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCategorySelect(category) {
    setSelectedCategory(category);
    document.querySelector(".items-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function shareHaveIt() {
    const shareData = { title: "HaveIt", text: "Borrow useful things from people nearby.", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setSuccessMessage("HaveIt link ready to share.");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch {}
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("All");
    setDistanceFilter("any");
    setLendingFilter("all");
    setConditionFilter("all");
    setSortBy("nearest");
    setSearchStartDate("");
    setSearchEndDate("");
    setAvailableItemIds(null);
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="nav-inner">
          <button
            className="brand"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            <div className="brand-mark">H</div>

            <div>
              <div className="brand-name">
                HaveIt
              </div>

              <div className="brand-tagline">
                Borrow locally.
              </div>
            </div>
          </button>

          <div className="nav-actions">
            {session ? (
              <>
                <button
                  className="icon-nav-button notification-trigger"
                  type="button"
                  onClick={() => setNotificationOpen((current) => !current)}
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unreadNotificationCount > 0 && (
                    <span className="notification-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>
                  )}
                </button>

                <button className="requests-nav-button" onClick={openRequests}>
                  <Inbox size={16} />
                  Requests
                </button>

                <button className="dashboard-nav-button" onClick={() => setDashboardOpen(true)}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>


                <button type="button" className="user-pill" onClick={openProfile} title="View and edit your profile">
                  <div className="user-avatar">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" />
                    ) : (
                      (profile?.name || session.user.email || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="user-pill-name">
                    {profile?.name || session.user.email?.split("@")[0] || "User"}
                  </span>
                  <span className="user-pill-mobile-label">Profile</span>
                </button>

                <button className="nav-logout" onClick={logout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <button
                className="nav-login"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                Log in
              </button>
            )}

            <button className="nav-list-button" onClick={openListItem}>
              <Plus size={17} />
              List an Item
            </button>
          </div>
        </div>
      </header>

      <section className="marketplace-home-shell">
        <div className="marketplace-topline">
          <button type="button" className="marketplace-location" onClick={requestLocation}>
            <span className="marketplace-location-icon"><LocateFixed size={17} /></span>
            <span><small>Borrowing around</small><strong>{location ? (locationLabel || "Current location") : "Set your location"}</strong></span>
            <ChevronRight size={17} />
          </button>
          <div className="marketplace-top-actions">
            {session && <button type="button" onClick={() => setNotificationOpen((current) => !current)} aria-label="Notifications"><Bell size={18} />{unreadNotificationCount > 0 && <b>{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</b>}</button>}
            <button type="button" onClick={shareHaveIt} aria-label="Share HaveIt"><Share2 size={18} /></button>
          </div>
        </div>

        <div className="marketplace-search-wrap">
          <div className={`marketplace-search-box ${searchFocused ? "is-focused" : ""}`}>
            <Search size={21} />
            <input type="search" placeholder="Search laptops, drills, cameras, books..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onFocus={() => setSearchFocused(true)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); if (event.key === "Escape") setSearchFocused(false); }} aria-label="Search items to borrow" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search"><X size={17} /></button>}
            <button type="button" className="voice-search-button" onClick={() => setSuccessMessage("Voice search can be connected when microphone access is enabled.")} aria-label="Voice search"><Mic size={19} /></button>
            <button type="button" className="scan-search-button" onClick={() => setSuccessMessage("Visual search can be connected to your camera next.")} aria-label="Visual search"><ScanLine size={20} /></button>
          </div>
          {searchFocused && (
            <div className="search-suggestion-panel">
              <div className="search-suggestion-head"><strong>{searchQuery ? "Popular nearby matches" : "Quick search"}</strong><span>Fast discovery</span></div>
              {!searchQuery && recentSearches.length > 0 && <div className="search-history-row"><Clock4 size={14} />{recentSearches.map((term) => <button key={term} type="button" onClick={() => { setSearchQuery(term); rememberSearch(term); setSearchFocused(false); }}>{term}</button>)}</div>}
              <div className="search-suggestion-chips">{["Laptop", "Drill", "Camera", "Projector", "Camping", "Party speaker"].map((term) => <button key={term} type="button" onClick={() => { setSearchQuery(term); rememberSearch(term); setSearchFocused(false); }}>{term}</button>)}</div>
            </div>
          )}
        </div>

        <div className="marketplace-category-rail" aria-label="Browse categories">
          {categories.map((category) => (
            <button key={category} type="button" className={selectedCategory === category ? "active" : ""} onClick={() => handleCategorySelect(category)}>
              <span className="marketplace-category-icon">{category === "All" ? "✨" : getCategoryIcon(category)}</span><span>{category}</span>
            </button>
          ))}
        </div>

        <div className="marketplace-quick-actions">
          <button type="button" onClick={openListItem}><span><Plus size={19} /></span><div><strong>List an item</strong><small>Share & build trust</small></div><ChevronRight size={16} /></button>
          <button type="button" onClick={openNeed}><span><Search size={18} /></span><div><strong>Post a need</strong><small>Let owners find you</small></div><ChevronRight size={16} /></button>
          <button type="button" onClick={() => setDashboardOpen(true)}><span><Bookmark size={18} /></span><div><strong>Saved items</strong><small>{favoriteIds.length} saved</small></div><ChevronRight size={16} /></button>
          <button type="button" onClick={openRequests}><span><Inbox size={18} /></span><div><strong>My activity</strong><small>Requests & returns</small></div><ChevronRight size={16} /></button>
        </div>
      </section>

      <main>
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                YOUR NEIGHBOURHOOD, SHARED
              </div>

              <h1>
                Need something?
                <br />
                <span>
                  Someone nearby might have it.
                </span>
              </h1>

              <p className="hero-description">
                Borrow useful things from people around
                you instead of buying something you'll
                barely use.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={requestLocation}
                >
                  {locationLoading ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="location-spin"
                      />
                      Finding you...
                    </>
                  ) : location ? (
                    <>
                      <CheckCircle2 size={18} />
                      Location enabled
                    </>
                  ) : (
                    <>
                      <Navigation size={18} />
                      Use my location
                    </>
                  )}
                </button>

                <button
                  className="secondary-button"
                  onClick={openNeed}
                >
                  Post a Need
                  <ArrowRight size={17} />
                </button>
              </div>

              {locationMessage && (
                <div className="location-message">
                  <MapPin size={15} />
                  {locationMessage}
                </div>
              )}
            </div>

            <div className="hero-card">
              <div className="hero-card-top">
                <div className="hero-card-label">
                  <span className="live-dot" />
                  AVAILABLE RIGHT NOW
                </div>
                <span className="hero-count">{filteredItems.length}</span>
              </div>

              {filteredItems.slice(0, 3).map((item) => (
                <button className="hero-item-preview" key={item.id} onClick={() => handleItemClick(item)}>
                  <div className="preview-icon">
                    {item.image_url ? <img src={item.image_url} alt="" /> : getCategoryIcon(item.category)}
                  </div>
                  <div className="preview-info">
                    <strong>{item.name}</strong>
                    <span>{item.category} · {item.lending_type === "paid" ? `₹${item.price_per_day}/day` : "Free"}</span>
                  </div>
                  <div className="preview-distance">
                    {getItemDistance(item) !== null ? formatDistance(getItemDistance(item)) : "Nearby"}
                  </div>
                </button>
              ))}

              {filteredItems.length === 0 && (
                <div className="hero-empty-preview">
                  <Sparkles size={18} />
                  <strong>No public items yet</strong>
                  <span>Be the first person nearby to share something.</span>
                </div>
              )}

              <button className="hero-card-footer" onClick={() => window.scrollTo({ top: document.querySelector(".items-section")?.offsetTop || 0, behavior: "smooth" })}>
                Browse available items <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <section className="search-section">
          <div className="search-container">
            <div className="search-box">
              <Search size={20} />

              <input
                type="text"
                placeholder="What do you need to borrow?"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
              />

              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="filter-row">
              <div className="category-filters">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-chip ${selectedCategory === category ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category !== "All" && <span>{getCategoryIcon(category)}</span>}
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="advanced-filter-row">
              <div className="filter-field">
                <SlidersHorizontal size={15} />
                <select value={distanceFilter} onChange={(event) => setDistanceFilter(event.target.value)}>
                  <option value="any">Any distance</option>
                  <option value="1">Within 1 km</option>
                  <option value="3">Within 3 km</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                </select>
              </div>

              <div className="filter-field">
                <WalletCards size={15} />
                <select value={lendingFilter} onChange={(event) => setLendingFilter(event.target.value)}>
                  <option value="all">Free or paid</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                </select>
              </div>

              <div className="filter-field">
                <BadgeCheck size={15} />
                <select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
                  <option value="all">Any condition</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>

              <div className="filter-field">
                <ArrowUpDown size={15} />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="nearest">Nearest first</option>
                  <option value="newest">Newest</option>
                  <option value="price_low">Lowest price</option>
                  <option value="price_high">Highest price</option>
                </select>
              </div>
            </div>

            <div className="marketplace-shortcuts" aria-label="HaveIt shortcuts">
              <button type="button" onClick={openNeed}><Search size={15} /><span>Post a Need</span></button>
              <button type="button" onClick={openRequests}><Inbox size={15} /><span>My requests</span></button>
              <button type="button" onClick={() => setDashboardOpen(true)}><Heart size={15} /><span>Saved items</span></button>
              <button type="button" onClick={openListItem}><Plus size={15} /><span>List an item</span></button>
            </div>

            <div className="availability-filter-row">
              <div className="date-filter-label"><CalendarClock size={15} /> Need it from</div>
              <input type="date" min={getTodayString()} value={searchStartDate} onChange={(event) => { const next = event.target.value; setSearchStartDate(next); if (searchEndDate && next > searchEndDate) setSearchEndDate(next); }} />
              <span>to</span>
              <input type="date" min={searchStartDate || getTodayString()} value={searchEndDate} onChange={(event) => setSearchEndDate(event.target.value)} />
              {(searchStartDate || searchEndDate) && (
                <button type="button" className="clear-date-filter" onClick={() => { setSearchStartDate(""); setSearchEndDate(""); setAvailableItemIds(null); }}>
                  Clear dates
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="items-section">
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">
                {location
                  ? "NEARBY YOU"
                  : "AVAILABLE NOW"}
              </div>

              <h2>
                {searchQuery ||
                selectedCategory !== "All"
                  ? "Matching items"
                  : "Things people are sharing"}
              </h2>
            </div>

            <div className="items-heading-actions">
              <div className="results-count">{filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}</div>
              <div className="view-toggle" aria-label="Discovery view">
                <button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}><List size={15} /> List</button>
                <button type="button" className={viewMode === "map" ? "active" : ""} onClick={() => setViewMode("map")}><Map size={15} /> Map</button>
              </div>
            </div>
          </div>

          {itemsLoading ? (
            <div className="items-loading">
              <LoaderCircle
                className="location-spin"
                size={28}
              />

              <span>
                Loading available items...
              </span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={28} />
              </div>

              <h3>No matching items</h3>

              <p>
                Try another search, category, or a
                wider distance range.
              </p>

              <button
                className="secondary-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === "map" ? (
            <NearbyMap items={filteredItems} location={location} onOpen={handleItemClick} onRequestLocation={requestLocation} />
          ) : (
            <div className="items-grid">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  distance={item.calculatedDistance}
                  isFavorite={favoriteIds.includes(item.id)}
                  onFavorite={() => toggleFavorite(item.id)}
                  onOpen={() => handleItemClick(item)}
                  onRequest={() => handleRequestClick(item)}
                  onReport={() => setReportTarget({ targetType: "item", targetId: item.id })}
                />
              ))}
            </div>
          )}
        </section>

        {recentItemIds.length > 0 && (
          <section className="recently-viewed-section">
            <div className="section-heading">
              <div><div className="section-eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Recently viewed</h2></div>
              <button type="button" className="section-link-button" onClick={() => { setRecentItemIds([]); try { localStorage.removeItem("haveit_recent_items"); } catch {} }}>Clear</button>
            </div>
            <div className="recently-viewed-rail">
              {recentItemIds.map((id) => items.find((item) => item.id === id)).filter(Boolean).map((item) => (
                <button type="button" className="recent-view-card" key={item.id} onClick={() => handleItemClick(item)}>
                  <div className="recent-view-image">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : getCategoryIcon(item.category)}</div>
                  <div><strong>{item.name}</strong><span>{item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}</span></div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="needs-discovery-section">
          <div className="section-heading needs-discovery-heading">
            <div>
              <div className="section-eyebrow">PEOPLE AROUND YOU</div>
              <h2>What neighbours are looking for</h2>
            </div>
            <div className="results-count">{nearbyNeeds.length} open needs</div>
          </div>

          {nearbyNeedsLoading ? (
            <div className="needs-discovery-loading">
              <LoaderCircle size={23} className="location-spin" />
              <span>Finding nearby needs...</span>
            </div>
          ) : nearbyNeeds.length === 0 ? (
            <div className="needs-discovery-empty">
              <Search size={22} />
              <span>No open needs yet. Post a Need when you need something specific.</span>
            </div>
          ) : (
            <div className="needs-discovery-grid">
              {nearbyNeeds.slice(0, 6).map((need) => {
                const ownItemMatch = matchingNeedPairs.find((pair) => pair.need.id === need.id);
                return (
                  <div className="need-discovery-card" key={need.id}>
                    <div className="need-discovery-icon">{getCategoryIcon(need.category || "Other")}</div>
                    <div className="need-discovery-copy">
                      <strong>{need.item_name}</strong>
                      <span>{need.category || "Other"} · needed {formatRequestDate(need.needed_from)}</span>
                      <small>
                        {need.distance_km !== null && need.distance_km !== undefined
                          ? `${need.distance_km.toFixed(1)} km away`
                          : `Within ${need.max_distance_km} km`}
                      </small>
                    </div>
                    {ownItemMatch && session && (
                      <button
                        type="button"
                        className="mini-offer-button"
                        onClick={() => setOfferNeed(need)}
                        title={`Offer ${ownItemMatch.item.name}`}
                      >
                        <ArrowRight size={14} /> Offer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {session && recommendedItems.length > 0 && (
          <section className="recommendation-section">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">SMART PICKS</div>
                <h2>Picked for you</h2>
              </div>
              <span className="section-note"><Sparkles size={15} /> Based on saved interests and nearby availability</span>
            </div>
            <div className="recommendation-grid">
              {recommendedItems.map((item) => (
                <ItemCard
                  key={`recommended-${item.id}`}
                  item={item}
                  distance={item.calculatedDistance}
                  isFavorite={favoriteIds.includes(item.id)}
                  onFavorite={() => toggleFavorite(item.id)}
                  onOpen={() => handleItemClick(item)}
                  onRequest={() => handleRequestClick(item)}
                  onReport={() => setReportTarget({ targetType: "item", targetId: item.id })}
                />
              ))}
            </div>
          </section>
        )}

        {session && matchingNeedPairs.length > 0 && (
          <section className="match-section">
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">NEED → ITEM MATCHING</div>
                <h2>You can help someone nearby</h2>
              </div>
              <span className="section-note">Your matching listings are private until you offer them.</span>
            </div>
            <div className="match-grid">
              {matchingNeedPairs.map(({ need, item }) => (
                <div className="match-card" key={`${need.id}-${item.id}`}>
                  <div className="match-side">
                    <span className="match-kicker">THEY NEED</span>
                    <strong>{need.item_name}</strong>
                    <small>{need.category || "Other"}</small>
                  </div>
                  <ArrowRight size={18} className="match-arrow" />
                  <div className="match-side match-item-side">
                    <span className="match-kicker">YOU HAVE</span>
                    <strong>{item.name}</strong>
                    <small>{item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}</small>
                  </div>
                  <button type="button" className="primary-button small-primary" onClick={() => setOfferNeed(need)}>Offer item</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="trust-section">
          <div className="trust-grid">
            <div className="trust-card">
              <ShieldCheck size={25} />

              <div>
                <strong>
                  Built around trust
                </strong>

                <span>
                  Profiles, reviews and
                  reliability scores help people
                  borrow with confidence.
                </span>
              </div>
            </div>

            <div className="trust-card">
              <MapPin size={25} />

              <div>
                <strong>
                  Keep your location private
                </strong>

                <span>
                  We use your location for distance
                  calculations without publicly
                  showing your exact address.
                </span>
              </div>
            </div>

            <div className="trust-card">
              <Clock3 size={25} />

              <div>
                <strong>
                  Borrow, don't buy
                </strong>

                <span>
                  Get access to useful things
                  without buying something you
                  only need occasionally.
                </span>
              </div>
            </div>

            <div className="trust-card">
              <Users size={25} />

              <div>
                <strong>
                  Powered by neighbours
                </strong>

                <span>
                  Every useful item shared makes
                  the local community more
                  resourceful.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onInstall={promptInstallApp}
          onAdminSuccess={() => {
            setAuthOpen(false);
            setAdminOpen(true);
            setSuccessMessage("Admin access granted.");
            setTimeout(() => setSuccessMessage(""), 3500);
          }}
          onSuccess={() => {
            setAuthOpen(false);

            setSuccessMessage(
              authMode === "login"
                ? "Welcome back to HaveIt."
                : "Account created successfully."
            );

            setTimeout(
              () => setSuccessMessage(""),
              3500
            );
          }}
        />
      )}

      {needOpen && (
        <NeedModal
          onClose={() => setNeedOpen(false)}
          onSuccess={() => {
            setNeedOpen(false);
            setSuccessMessage(
              "Your need has been posted. Nearby lenders can now see it."
            );

            setTimeout(
              () => setSuccessMessage(""),
              4000
            );
          }}
        />
      )}

      {addItemOpen && (
        <AddItemModal
          location={location}
          onClose={() =>
            setAddItemOpen(false)
          }
          onSuccess={() => {
            setAddItemOpen(false);
            loadItems();

            setSuccessMessage(
              "Your item is now listed on HaveIt."
            );

            setTimeout(
              () => setSuccessMessage(""),
              3500
            );
          }}
        />
      )}

      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem}
          distance={getItemDistance(selectedItem)}
          session={session}
          isFavorite={favoriteIds.includes(selectedItem.id)}
          isWaitlisted={waitlistedIds.includes(selectedItem.id)}
          onFavorite={() => toggleFavorite(selectedItem.id)}
          onWaitlist={() => toggleWaitlist(selectedItem.id)}
          onReport={() => setReportTarget({ targetType: "item", targetId: selectedItem.id })}
          onClose={() =>
            setSelectedItem(null)
          }
          onRequest={() =>
            handleRequestClick(
              selectedItem
            )
          }
        />
      )}

      {requestItem && (
        <BorrowRequestModal
          item={requestItem}
          session={session}
          onClose={() =>
            setRequestItem(null)
          }
          onSuccess={() => {
            setRequestItem(null);

            setSuccessMessage(
              "Borrow request sent to the item owner."
            );

            setTimeout(
              () => setSuccessMessage(""),
              4000
            );
          }}
        />
      )}

      {profileOpen && (
        <ProfileModal
          profile={profile}
          session={session}
          onClose={() => setProfileOpen(false)}
          onSaved={(nextProfile) => {
            setProfile(nextProfile);
            setProfileOpen(false);
            setSuccessMessage("Profile updated successfully.");
          }}
          onLogout={async () => {
            setProfileOpen(false);
            await logout();
          }}
          onDashboard={() => {
            setProfileOpen(false);
            setDashboardOpen(true);
          }}
          onRequestLocation={requestLocation}
          locationLabel={locationLabel}
          locationMessage={locationMessage}
        />
      )}

      {requestsOpen && (
        <RequestsModal
          session={session}
          onReport={(target) => setReportTarget(target)}
          onRequestItem={(item) => { setRequestsOpen(false); setRequestItem(item); }}
          onRefundRequested={(message) => { setSuccessMessage(message); setTimeout(() => setSuccessMessage(""), 3500); }}
          onClose={() =>
            setRequestsOpen(false)
          }
          onChat={(request) =>
            setChatRequest(request)
          }
          onContact={async (request) => {
            const { data, error } =
              await supabase.rpc(
                "get_borrow_contact",
                { request_id: request.id }
              );

            if (error || !data?.[0]?.email) {
              console.error(
                "Contact lookup error:",
                error
              );
              alert(
                "Contact details are not available yet."
              );
              return;
            }

            window.location.href =
              `mailto:${data[0].email}?subject=HaveIt - ${encodeURIComponent(
                request.item?.name ||
                  "Borrow request"
              )}`;
          }}
          onSuccess={(message) => {
            setSuccessMessage(message);

            setTimeout(
              () => setSuccessMessage(""),
              3500
            );
          }}
        />
      )}

      {notificationOpen && session && (
        <NotificationPopover
          notifications={notifications}
          unreadCount={unreadNotificationCount}
          onClose={() => setNotificationOpen(false)}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
          onOpenRequest={(notification) => {
            setNotificationOpen(false);
            if (notification.entity_type === "borrow_request") setRequestsOpen(true);
          }}
        />
      )}

      {dashboardOpen && session && (
        <DashboardModal
          session={session}
          profile={profile}
          items={items}
          favoriteIds={favoriteIds}
          blockedUserIds={blockedUserIds}
          waitlistedIds={waitlistedIds}
          onClose={() => setDashboardOpen(false)}
          onOpenItem={handleItemClick}
          onRequest={handleRequestClick}
          onFavorite={toggleFavorite}
          onAvailability={setAvailabilityItem}
          onUnblock={unblockUser}
          onWaitlist={toggleWaitlist}
          onItemsChanged={loadItems}
        />
      )}

      {availabilityItem && session && (
        <AvailabilityModal
          item={availabilityItem}
          onClose={() => setAvailabilityItem(null)}
          onSaved={async () => {
            setAvailabilityItem(null);
            await loadItems();
            setSuccessMessage("Availability calendar updated.");
            setTimeout(() => setSuccessMessage(""), 3500);
          }}
        />
      )}

      {offerNeed && session && (
        <OfferNeedModal
          need={offerNeed}
          session={session}
          items={items}
          onClose={() => setOfferNeed(null)}
          onSuccess={(message) => {
            setOfferNeed(null);
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(""), 3500);
            loadNotifications(session.user.id);
          }}
        />
      )}

      {reportTarget && session && (
        <ReportModal
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={async (payload) => {
            const ok = await submitReport(payload);
            if (ok) setReportTarget(null);
            return ok;
          }}
        />
      )}

      {chatRequest && session && (
        <ChatModal
          request={chatRequest}
          session={session}
          onClose={() => setChatRequest(null)}
        />
      )}

      {adminOpen && session && isAdmin && <AdminModal onClose={() => setAdminOpen(false)} />}
      {installHelpOpen && <InstallHelpModal onClose={() => setInstallHelpOpen(false)} onTryInstall={promptInstallApp} />}

      {session && (
        <nav className="mobile-bottom-nav marketplace-bottom-nav" aria-label="Mobile navigation">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><HomeIcon size={17} /><span>Home</span></button>
          <button type="button" onClick={() => setDashboardOpen(true)}><Heart size={17} /><span>Saved</span></button>
          <button type="button" className="mobile-nav-add" onClick={openListItem} aria-label="List an item"><span className="mobile-nav-add-icon"><Plus size={20} /></span><span>List</span></button>
          <button type="button" onClick={openRequests} className="mobile-nav-with-badge"><Inbox size={17} /><span>Requests</span>{unreadNotificationCount > 0 && <b>{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</b>}</button>
          <button type="button" onClick={openProfile}><UserRound size={17} /><span>Profile</span></button>
        </nav>
      )}

      {successMessage && (
        <div className="success-toast">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}
    </div>
  );
}


function InstallHelpModal({ onClose, onTryInstall }) {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal install-help-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button"><X size={18} /></button>
        <div className="modal-icon"><Download size={22} /></div>
        <div className="modal-kicker">INSTALL HAVEIT</div>
        <h2>Add HaveIt to your phone</h2>
        <p className="modal-subtitle">Use HaveIt like an app, with a home-screen icon and a cleaner full-screen experience.</p>
        <div className="install-step-list">
          {isIOS ? (
            <><div><span>1</span><strong>Open HaveIt in Safari</strong></div><div><span>2</span><strong>Tap Share</strong></div><div><span>3</span><strong>Choose “Add to Home Screen”</strong></div></>
          ) : (
            <><div><span>1</span><strong>Use Chrome on your phone</strong></div><div><span>2</span><strong>Tap Install when HaveIt offers it</strong></div><div><span>3</span><strong>Open HaveIt from the home screen</strong></div></>
          )}
        </div>
        {!isIOS && <button type="button" className="primary-button" onClick={onTryInstall}><Download size={16} /> Try install prompt</button>}
        <div className="privacy-note"><ShieldCheck size={16} /> The install prompt requires HaveIt to be served over HTTPS. A local IP address over plain HTTP is fine for testing, but may not expose the install prompt.</div>
      </div>
    </div>
  );
}

function NearbyMap({ items, location, onOpen, onRequestLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [ready, setReady] = useState(Boolean(window.L));
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.L) { setReady(true); return undefined; }
    if (!document.getElementById("haveit-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "haveit-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    let script = document.querySelector('script[data-haveit-leaflet="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.dataset.haveitLeaflet = "true";
      document.body.appendChild(script);
    }
    const handleLoad = () => setReady(true);
    const handleError = () => setError("Map library could not load. Try the list view instead.");
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (!ready || !location || !mapRef.current || !window.L) return undefined;
    if (mapInstanceRef.current) mapInstanceRef.current.remove();
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([location.latitude, location.longitude], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    L.marker([location.latitude, location.longitude]).addTo(map).bindPopup("You are here");
    const bounds = L.latLngBounds([[location.latitude, location.longitude]]);
    items.slice(0, 50).forEach((item) => {
      if (item.latitude == null || item.longitude == null) return;
      const marker = L.marker([item.latitude, item.longitude]).addTo(map);
      marker.bindPopup(`<strong>${String(item.name).replace(/</g, "&lt;")}</strong><br>${item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}`);
      marker.on("click", () => onOpen(item));
      bounds.extend([item.latitude, item.longitude]);
    });
    if (items.some((item) => item.latitude != null && item.longitude != null)) map.fitBounds(bounds.pad(0.12));
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [ready, location, items, onOpen]);

  if (!location) return (
    <div className="map-empty-state">
      <div className="map-empty-icon"><MapPin size={24} /></div>
      <strong>Turn on location to use the map.</strong>
      <span>HaveIt uses your location only to show approximate nearby results.</span>
      <button type="button" className="primary-button" onClick={onRequestLocation}><Navigation size={16} /> Use my location</button>
    </div>
  );

  return (
    <div className="nearby-map-card">
      <div className="map-toolbar"><div><strong>Nearby map</strong><span>{items.length} matching items</span></div><span>OpenStreetMap</span></div>
      {!ready && !error ? <div className="map-loading"><LoaderCircle size={22} className="location-spin" /> Loading map…</div> : error ? <div className="map-error">{error}</div> : <div ref={mapRef} className="nearby-map-canvas" />}
    </div>
  );
}

function AdminModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("overview");
  const [adminItems, setAdminItems] = useState([]);
  const [itemActionId, setItemActionId] = useState(null);

  async function load() {
    setRefreshing(true);
    const [dashboardResponse, itemsResponse] = await Promise.all([
      supabase.rpc("get_haveit_admin_dashboard_v1"),
      supabase.rpc("get_haveit_admin_items_v1"),
    ]);
    if (dashboardResponse.error) { alert(dashboardResponse.error.message); setRefreshing(false); setLoading(false); return; }
    if (itemsResponse.error) { alert(itemsResponse.error.message); setRefreshing(false); setLoading(false); return; }
    setData(dashboardResponse.data || null);
    setAdminItems(itemsResponse.data || []);
    setRefreshing(false);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateReport(reportId, status) {
    const { error } = await supabase.rpc("admin_set_report_status_v1", { report_id_value: reportId, status_value: status });
    if (error) { alert(error.message); return; }
    await load();
  }

  async function processRefund(refundId) {
    const { data: result, error } = await supabase.functions.invoke("process-razorpay-refund", { body: { refund_request_id: refundId } });
    if (error || !result?.ok) { alert(error?.message || result?.error || "Refund could not be processed."); return; }
    await load();
  }

  async function removeAdminItem(item) {
    const confirmed = window.confirm(`Remove “${item.name}” from the marketplace?`);
    if (!confirmed) return;
    setItemActionId(item.id);
    const { error } = await supabase.rpc("admin_delete_item_v1", { item_id_value: item.id });
    if (error) {
      alert(error.message || "Unable to remove listing.");
      setItemActionId(null);
      return;
    }
    await load();
    setItemActionId(null);
  }

  const stats = data?.stats || {};
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const payments = Array.isArray(data?.payments) ? data.payments : [];
  const refunds = Array.isArray(data?.refunds) ? data.refunds : [];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="admin-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button"><X size={19} /></button>
        <div className="admin-header"><div><div className="details-eyebrow">OPERATIONS</div><h2>HaveIt Admin</h2><p>Keep the marketplace healthy from one place.</p></div><button type="button" className="secondary-button" onClick={load} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "location-spin" : ""} /> Refresh</button></div>
        <div className="admin-tabs">{[["overview","Overview"],["items","Items"],["reports","Reports"],["payments","Payments"],["refunds","Refunds"]].map(([key,label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}{key === "reports" && stats.open_reports ? <span>{stats.open_reports}</span> : null}</button>)}</div>
        {loading ? <div className="requests-loading"><LoaderCircle size={24} className="location-spin" /><span>Loading admin data…</span></div> : tab === "overview" ? (
          <div className="admin-content"><div className="admin-stat-grid"><div><span>Users</span><strong>{stats.users || 0}</strong></div><div><span>Available items</span><strong>{stats.available_items || 0}</strong></div><div><span>Open reports</span><strong>{stats.open_reports || 0}</strong></div><div><span>Paid volume</span><strong>{formatInrFromPaise(stats.paid_volume_paise || 0)}</strong></div></div><div className="admin-note"><ShieldCheck size={17} /><span>Admin data is returned by server-side functions. Payment secrets never enter the browser.</span></div></div>
        ) : tab === "items" ? (
          <div className="admin-list">
            {adminItems.length === 0 ? (
              <div className="dashboard-empty"><Store size={23} /><strong>No listings found.</strong><span>New item listings will appear here.</span></div>
            ) : adminItems.map((item) => (
              <div className={`admin-report-row admin-item-admin-row ${item.deleted_at ? "is-deleted" : ""}`} key={item.id}>
                <div className="admin-item-thumb">{item.image_url ? <img src={item.image_url} alt="" /> : getCategoryIcon(item.category)}</div>
                <div className="admin-report-copy">
                  <strong>{item.name}</strong>
                  <span>{item.category || "Other"} · {item.owner_name || "Unknown owner"} · {item.is_available ? "Available" : "Unavailable"}</span>
                  <small>{item.owner_phone ? `Owner phone: ${item.owner_phone}` : "No phone added"} · Posted {formatRequestDate(item.created_at)}</small>
                </div>
                <div className="admin-row-actions">
                  {item.deleted_at ? <span className="admin-status-pill">Removed</span> : <button type="button" className="tiny-action danger" onClick={() => removeAdminItem(item)} disabled={itemActionId === item.id}>{itemActionId === item.id ? <LoaderCircle size={14} className="location-spin" /> : <Trash2 size={14} />} Remove</button>}
                </div>
              </div>
            ))}
          </div>
        ) : tab === "reports" ? (
          <div className="admin-list">{reports.length === 0 ? <div className="dashboard-empty"><Flag size={23} /><strong>No reports.</strong><span>Everything is clear right now.</span></div> : reports.map((report) => <div className="admin-report-row" key={report.id}><div className="admin-report-icon"><Flag size={16} /></div><div className="admin-report-copy"><strong>{report.reason}</strong><span>{report.target_type} · {report.status} · {formatRequestDate(report.created_at)}</span><small>{report.details || "No additional details."}</small></div><div className="admin-row-actions"><button type="button" className="tiny-action secondary" onClick={() => updateReport(report.id, "reviewing")}>Review</button><button type="button" className="tiny-action" onClick={() => updateReport(report.id, "resolved")}>Resolve</button></div></div>)}</div>
        ) : tab === "payments" ? (
          <div className="admin-list">{payments.length === 0 ? <div className="dashboard-empty"><CreditCard size={23} /><strong>No payment activity yet.</strong><span>Verified payments will appear here.</span></div> : payments.map((payment) => <div className="admin-report-row" key={payment.id}><div className="admin-report-icon"><CreditCard size={16} /></div><div className="admin-report-copy"><strong>{formatInrFromPaise(payment.amount_paise)}</strong><span>{payment.status} · {payment.request_id?.slice(0, 8)}…</span><small>{payment.razorpay_payment_id || "Awaiting provider payment id"}</small></div><span className="admin-status-pill">{payment.status}</span></div>)}</div>
        ) : (
          <div className="admin-list">{refunds.length === 0 ? <div className="dashboard-empty"><RotateCcw size={23} /><strong>No refund requests.</strong><span>Refund requests will appear here for admin review.</span></div> : refunds.map((refund) => <div className="admin-report-row" key={refund.id}><div className="admin-report-icon"><RotateCcw size={16} /></div><div className="admin-report-copy"><strong>{formatInrFromPaise(refund.amount_paise)}</strong><span>{refund.status} · {formatRequestDate(refund.created_at)}</span><small>{refund.reason}</small></div><span className="admin-status-pill">{refund.status}</span>{refund.status === "pending" && <button type="button" className="tiny-action" onClick={() => processRefund(refund.id)}>Process refund</button>}</div>)}</div>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  distance,
  isFavorite,
  onFavorite,
  onOpen,
  onRequest,
  onReport,
}) {
  const priceLabel = item.lending_type === "paid" && item.price_per_day
    ? `₹${item.price_per_day}/day`
    : "Free";

  return (
    <article className="item-card upgraded-item-card compact-market-card">
      <div className="compact-card-media-wrap">
        <button
          type="button"
          className="favorite-floating-button"
          onClick={(event) => { event.stopPropagation(); onFavorite(); }}
          aria-label={isFavorite ? "Remove from saved items" : "Save item"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <button className="item-card-click" onClick={onOpen} type="button">
          <div className="item-image">
            {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" /> : <div className="item-placeholder">{getCategoryIcon(item.category)}</div>}
            <div className="item-category">{item.category}</div>
            <div className={item.lending_type === "paid" ? "item-paid-pill" : "item-free-pill"}>{priceLabel}</div>
          </div>
        </button>
      </div>
      <div className="item-content compact-item-content">
        <button className="compact-item-open" onClick={onOpen} type="button">
          <div className="item-title-row">
            <h3>{item.name}</h3>
            <div className="availability-badge-inline"><span /> Available</div>
          </div>
          <div className="compact-item-subline">
            <span>{item.condition || "Good condition"}</span><span>•</span>
            <span>{distance !== null && distance !== undefined ? formatDistance(distance) : "Nearby"}</span>
          </div>
        </button>
        <div className="item-bottom compact-item-bottom">
          <div className="item-owner-caption"><UserRound size={12} /> Local member</div>
          <div className="item-bottom-actions">
            <button type="button" className="tiny-icon-button" onClick={onReport} aria-label="Report listing"><Flag size={14} /></button>
            <button className="request-button" onClick={onRequest} type="button">Request <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ItemDetailsModal({
  item,
  distance,
  session,
  isFavorite,
  isWaitlisted,
  onFavorite,
  onWaitlist,
  onReport,
  onClose,
  onRequest,
}) {
  const isOwner = session && item.owner_id === session.user.id;
  const isAvailable = item.is_available !== false;
  const [ownerSnapshot, setOwnerSnapshot] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadOwner() {
      const { data, error } = await supabase.rpc("get_item_owner_snapshot_v1", { item_id_value: item.id });
      if (!error && data?.[0] && mounted) setOwnerSnapshot(data[0]);
    }
    loadOwner();
    return () => { mounted = false; };
  }, [item.id]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="item-details-modal upgraded-details-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="details-image">
          {item.image_url ? <img src={item.image_url} alt={item.name} /> : <div className="details-placeholder">{getCategoryIcon(item.category)}</div>}
          <div className="details-category">{item.category}</div>
          <button className="details-save-button" type="button" onClick={onFavorite} aria-label="Save item">
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="details-content">
          <div className="details-heading">
            <div>
              <div className="details-eyebrow">{isAvailable ? "AVAILABLE TO BORROW" : "CURRENTLY UNAVAILABLE"}</div>
              <h2>{item.name}</h2>
            </div>
            <div className={`details-availability ${isAvailable ? "" : "unavailable"}`}><span /> {isAvailable ? "Available now" : "Unavailable"}</div>
          </div>

          <p className="details-description">{item.description || "The owner has not added a description yet."}</p>

          <div className="details-info-grid">
            <div className="details-info"><div className="details-info-icon"><BadgeCheck size={17} /></div><div><span>Condition</span><strong>{item.condition || "Good"}</strong></div></div>
            <div className="details-info"><div className="details-info-icon"><MapPin size={17} /></div><div><span>Distance</span><strong>{distance !== null && distance !== undefined ? formatDistance(distance) : "Unavailable"}</strong></div></div>
            <div className="details-info"><div className="details-info-icon"><UserRound size={17} /></div><div><span>Owner</span><strong>{ownerSnapshot?.name || "HaveIt member"}</strong></div></div>
            <div className="details-info"><div className="details-info-icon"><Star size={17} /></div><div><span>Trust</span><strong>{ownerSnapshot ? `${Number(ownerSnapshot.reliability_score || 5).toFixed(1)} ★ · ${ownerSnapshot.review_count || 0} reviews` : "HaveIt member"}</strong></div></div>
            <div className="details-info"><div className="details-info-icon"><CalendarDays size={17} /></div><div><span>Rental</span><strong>{item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}</strong></div></div>
            {(item.available_from || item.available_until) && (
              <div className="details-info"><div className="details-info-icon"><CalendarClock size={17} /></div><div><span>Availability</span><strong>{item.available_from ? formatRequestDate(item.available_from) : "Now"} → {item.available_until ? formatRequestDate(item.available_until) : "Open"}</strong></div></div>
            )}
          </div>

          <div className="privacy-note"><ShieldCheck size={17} /><span>Exact owner location is never shown publicly. Contact details can be shared after a request is accepted.</span></div>

          <div className="details-actions upgraded-details-actions">
            <button className="secondary-button" onClick={onClose} type="button">Close</button>
            <button className="secondary-button danger-outline" onClick={onReport} type="button"><Flag size={16} /> Report</button>
            {!isAvailable && !isOwner ? (
              <button className="primary-button" onClick={onWaitlist} type="button"><Bell size={16} /> {isWaitlisted ? "On waitlist" : "Notify me"}</button>
            ) : (
              <button className="primary-button" onClick={onRequest} disabled={isOwner || !isAvailable} type="button">
                {isOwner ? "Your item" : "Request to borrow"}
                {!isOwner && <ArrowRight size={17} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function NeedModal({ onClose, onSuccess }) {
  const today = getTodayString();
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Tools");
  const [neededFrom, setNeededFrom] = useState(today);
  const [neededUntil, setNeededUntil] = useState(today);
  const [maxDistance, setMaxDistance] = useState("5");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleFromChange(event) {
    const nextFrom = event.target.value;
    setNeededFrom(nextFrom);
    if (neededUntil && nextFrom > neededUntil) setNeededUntil(nextFrom);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    if (!itemName.trim()) return setErrorMessage("Please enter what you need.");
    if (!neededFrom || !neededUntil) return setErrorMessage("Please choose both dates.");
    if (neededUntil < neededFrom) return setErrorMessage("The end date must be on or after the start date.");
    setLoading(true);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      setErrorMessage("Please log in again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("needs").insert({
      requester_id: currentSession.user.id,
      item_name: itemName.trim(),
      category,
      needed_from: `${neededFrom}T00:00:00`,
      needed_until: `${neededUntil}T23:59:59`,
      max_distance_km: Number(maxDistance),
      status: "open",
    });

    if (error) {
      console.error("Need insert error:", error);
      setErrorMessage(error.message || "Unable to post your need.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal need-modal upgraded-form-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="modal-icon"><Search size={24} /></div>
        <div className="request-item-label">POST A NEED</div>
        <h2>Tell your neighbourhood what you need.</h2>
        <p className="modal-subtitle">A nearby owner can offer a matching item. Your exact location is never shown publicly.</p>

        <form onSubmit={handleSubmit}>
          <label>What do you need?<input type="text" placeholder="e.g. Cordless drill" value={itemName} onChange={(event) => setItemName(event.target.value)} autoFocus required /></label>

          <div className="form-row">
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((item) => item !== "All").map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Maximum distance<select value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)}><option value="1">Within 1 km</option><option value="3">Within 3 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option></select></label>
          </div>

          <div className="need-date-card">
            <label><span><CalendarDays size={15} /> Needed from</span><input className="date-input" type="date" min={today} value={neededFrom} onChange={handleFromChange} required /></label>
            <label><span><CalendarDays size={15} /> Needed until</span><input className="date-input" type="date" min={neededFrom || today} value={neededUntil} onChange={(event) => setNeededUntil(event.target.value)} required /></label>
          </div>

          <div className="privacy-note"><ShieldCheck size={17} /><span>We'll use your area to match nearby people, but your exact address is not displayed.</span></div>
          {errorMessage && <div className="form-error">{errorMessage}</div>}
          <button className="modal-submit" type="submit" disabled={loading}>{loading ? "Posting your need..." : "Post my need"}</button>
        </form>
      </div>
    </div>
  );
}
function BorrowRequestModal({
  item,
  session,
  onClose,
  onSuccess,
}) {
  const today = getTodayString();

  const [startDate, setStartDate] =
    useState(today);

  const [endDate, setEndDate] =
    useState(today);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");

    if (!session) {
      setErrorMessage(
        "Please log in to request an item."
      );
      return;
    }

    if (item.demo) {
      setErrorMessage(
        "This demo item isn't connected to a real owner yet."
      );
      return;
    }

    if (
      item.owner_id === session.user.id
    ) {
      setErrorMessage(
        "You cannot request your own item."
      );
      return;
    }

    if (endDate < startDate) {
      setErrorMessage(
        "Return date must be on or after the start date."
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("borrow_requests")
      .insert({
        item_id: item.id,
        borrower_id: session.user.id,
        owner_id: item.owner_id,
        start_date: `${startDate}T00:00:00`,
        end_date: `${endDate}T23:59:59`,
        status: "pending",
      });

    if (error) {
      console.error(
        "Borrow request error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to send request."
      );

      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal borrow-modal">
        <button
          className="modal-close"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="modal-icon">
          <CalendarDays size={25} />
        </div>

        <div className="request-item-label">
          REQUEST TO BORROW
        </div>

        <h2>{item.name}</h2>

        <p className="modal-subtitle">
          Choose when you need the item. The
          owner will receive your request and
          can accept or decline it.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="borrow-date-card">
            <label>
              <span>
                <CalendarDays size={15} />
                Start date
              </span>

              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartDate(nextStart);

                  if (endDate && nextStart > endDate) {
                    setEndDate(nextStart);
                  }
                }}
                inputMode="numeric"
                aria-label="Borrow start date"
                required
              />
            </label>

            <label>
              <span>
                <CalendarDays size={15} />
                Return date
              </span>

              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                inputMode="numeric"
                aria-label="Borrow return date"
                required
              />
            </label>
          </div>

          <div className="request-summary">
            <div>
              <span>Borrowing type</span>

              <strong>
                {item.lending_type ===
                  "paid" &&
                item.price_per_day
                  ? `₹${item.price_per_day} per day`
                  : "Free"}
              </strong>
            </div>

            <div>
              <span>Item condition</span>

              <strong>
                {item.condition || "Good"}
              </strong>
            </div>
          </div>

          {item.lending_type === "paid" && item.price_per_day ? (
            <div className="payment-estimate-card">
              <div>
                <span>Estimated rental</span>
                <strong>{Math.max(1, Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) + 1)} day(s)</strong>
              </div>
              <div className="payment-estimate-total">
                <span>Estimated total</span>
                <strong>₹{(Number(item.price_per_day) * (Math.max(1, Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) + 1))).toFixed(0)}</strong>
              </div>
            </div>
          ) : null}

          <div className="privacy-note">
            <ShieldCheck size={17} />

            <span>
              Your request shares the selected
              dates with the owner. Exact
              location details are handled
              separately.
            </span>
          </div>

          {errorMessage && (
            <div className="form-error">
              {errorMessage}
            </div>
          )}

          <button
            className="modal-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending request..."
              : "Send borrow request"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileModal({
  profile,
  session,
  onClose,
  onSaved,
  onLogout,
  onDashboard,
  onRequestLocation,
  locationLabel,
  locationMessage,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(profile?.name || "");
    setAvatarUrl(profile?.avatar_url || "");
    setPhoneNumber(profile?.phone_number || "");
  }, [profile]);

  async function uploadAvatar(file) {
    if (!session || !file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photos must be 5 MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    setError("");

    const uploadFile = await prepareImageForUpload(file, 1000);
    const path = `${session.user.id}/profile/${crypto.randomUUID()}.jpg`;

    const uploadBody = await uploadFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("haveit-images")
      .upload(path, uploadBody, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error("Profile photo upload error:", uploadError);
      setError(uploadError.message || "Unable to upload the profile photo.");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage
      .from("haveit-images")
      .getPublicUrl(path);

    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        name: trimmedName,
        avatar_url: avatarUrl.trim() || null,
        phone_number: trimmedPhone || null,
      })
      .eq("id", session.user.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError);
      setError(updateError.message || "Unable to update your profile.");
      setSaving(false);
      return;
    }

    onSaved(data);
    setSaving(false);
  }

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const hasLocation =
    profile?.latitude !== null &&
    profile?.latitude !== undefined &&
    profile?.longitude !== null &&
    profile?.longitude !== undefined;

  const displayName =
    profile?.name || session.user.email?.split("@")[0] || "User";

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="profile-modal modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close profile"
        >
          <X size={18} />
        </button>

        <div className="profile-modal-header">
          <div className="profile-avatar-large">
            {editing && avatarUrl.trim() ? (
              <img src={avatarUrl.trim()} alt="Profile preview" />
            ) : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
            {editing && (
              <label className="profile-avatar-upload" title="Upload profile photo">
                <ImagePlus size={15} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  disabled={uploadingAvatar}
                />
              </label>
            )}
          </div>
          <div>
            <div className="modal-kicker">YOUR PROFILE</div>
            <h2>{displayName}</h2>
            <p className="modal-subtitle">
              Manage how your neighbours see you on HaveIt.
            </p>
          </div>
        </div>

        {error && <div className="profile-error">{error}</div>}

        {editing ? (
          <form className="profile-form" onSubmit={saveProfile}>
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                maxLength={80}
                autoFocus
              />
            </label>

            <label>
              Contact number
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="e.g. +91 98765 43210"
                type="tel"
                inputMode="tel"
                maxLength={20}
              />
              <span className="profile-field-hint">Used for borrowing contact after a request is accepted. Not shown on public listings.</span>
            </label>

            <div className="profile-upload-row">
              <div>
                <strong>Profile photo</strong>
                <span>{uploadingAvatar ? "Uploading..." : "JPG, PNG or WebP · up to 5 MB"}</span>
              </div>
              <label className="secondary-button profile-upload-button">
                <ImagePlus size={16} />
                {uploadingAvatar ? "Uploading..." : "Choose photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <label>
              Profile photo URL <span>(optional)</span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                type="url"
              />
            </label>

            <div className="profile-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setName(profile?.name || "");
                  setAvatarUrl(profile?.avatar_url || "");
                  setPhoneNumber(profile?.phone_number || "");
                  setError("");
                  setEditing(false);
                }}
                disabled={saving || uploadingAvatar}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving || uploadingAvatar}
              >
                {saving ? <LoaderCircle size={16} className="location-spin" /> : <Check size={16} />}
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-stat-grid">
              <div className="profile-stat-card">
                <Star size={17} />
                <span>Reliability</span>
                <strong>
                  {Number(profile?.reliability_score ?? 5).toFixed(2)} / 5
                </strong>
              </div>
              <div className="profile-stat-card">
                <CalendarDays size={17} />
                <span>Member since</span>
                <strong>{joinedDate}</strong>
              </div>
            </div>

            <div className="profile-detail-list">
              <div className="profile-detail-row">
                <span>Name</span>
                <strong>{displayName}</strong>
              </div>
              <div className="profile-detail-row">
                <span>Email</span>
                <strong>{session.user.email || "—"}</strong>
              </div>
              <div className="profile-detail-row">
                <span>Contact number</span>
                <strong>{profile?.phone_number || "Not added"}</strong>
              </div>
              <div className="profile-detail-row profile-location-detail">
                <span>Current location</span>
                <strong>{hasLocation ? (locationLabel || "Current location") : "Not set"}</strong>
              </div>
            </div>

            <div className="profile-view-action-grid">
              <button
                type="button"
                className="secondary-button"
                onClick={onRequestLocation}
              >
                <MapPin size={16} />
                {hasLocation ? "Refresh location" : "Enable location"}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setError("");
                  setEditing(true);
                }}
              >
                <Pencil size={16} />
                Edit profile
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onDashboard}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
            </div>

            {locationMessage && (
              <div className="profile-location-message">
                <MapPin size={15} />
                <span>{locationMessage}</span>
              </div>
            )}

            <button
              type="button"
              className="profile-logout-button"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Log out of HaveIt
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RequestsModal({
  session,
  onClose,
  onSuccess,
  onChat,
  onContact,
  onReport,
  onRequestItem,
  onRefundRequested,
}) {
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState("received");
  const [reviewRequest, setReviewRequest] = useState(null);

  useEffect(() => {
    if (session) loadRequests();
  }, [session]);

  async function loadRequests() {
    setLoading(true);
    setLoadError("");

    const requestFields =
      "id, item_id, borrower_id, owner_id, start_date, end_date, status, payment_status, payment_amount_paise, payment_paid_at, created_at";

    const [sentResponse, receivedResponse, needsResponse] =
      await Promise.all([
        supabase
          .from("borrow_requests")
          .select(requestFields)
          .eq("borrower_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("borrow_requests")
          .select(requestFields)
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("needs")
          .select("*")
          .eq("requester_id", session.user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (sentResponse.error) console.error("Sent requests error:", sentResponse.error);
    if (receivedResponse.error) console.error("Received requests error:", receivedResponse.error);
    if (needsResponse.error) console.error("Needs load error:", needsResponse.error);

    const requestLoadErrors = [sentResponse, receivedResponse, needsResponse]
      .filter((response) => response.error)
      .map((response) => response.error.message)
      .filter(Boolean);

    if (requestLoadErrors.length) {
      setLoadError(requestLoadErrors.join(" | "));
    }

    setSentRequests(await attachItemData(sentResponse.data || []));
    setReceivedRequests(await attachItemData(receivedResponse.data || []));
    setNeeds(needsResponse.data || []);
    setLoading(false);
  }

  async function attachItemData(requestRows) {
    if (!requestRows.length) return [];

    const itemIds = [...new Set(requestRows.map((request) => request.item_id))];
    const { data, error } = await supabase
      .from("items")
      .select("id, name, category, condition, image_url, lending_type, price_per_day")
      .in("id", itemIds);

    if (error) {
      console.error("Request item lookup error:", error);
      return requestRows.map((request) => ({ ...request, item: null }));
    }

    const itemMap = new globalThis.Map((data || []).map((item) => [item.id, item]));
    return requestRows.map((request) => ({
      ...request,
      item: itemMap.get(request.item_id) || null,
    }));
  }

  async function updateRequestStatus(requestId, status) {
    setActionLoading(requestId);

    if (status === "accepted") {
      const { error } = await supabase.rpc("accept_borrow_request", {
        request_id: requestId,
      });

      if (error) {
        console.error("Accept request error:", error);
        alert(error.message);
        setActionLoading(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("borrow_requests")
        .update({ status })
        .eq("id", requestId);

      if (error) {
        console.error("Request update error:", error);
        alert(error.message);
        setActionLoading(null);
        return;
      }
    }

    await loadRequests();
    setActionLoading(null);

    const messages = {
      accepted: "Borrow request accepted. You can now coordinate the borrowing.",
      declined: "Borrow request declined.",
      cancelled: "Borrow request cancelled.",
    };
    onSuccess(messages[status] || "Request updated.");
  }

  async function startPayment(request) {
    setActionLoading(request.id);

    const { data, error } = await supabase.functions.invoke(
      "create-razorpay-order",
      { body: { request_id: request.id } }
    );

    if (error || !data?.order_id) {
      console.error("Create Razorpay order error:", error || data);
      alert(error?.message || data?.error || "Unable to start payment.");
      setActionLoading(null);
      return;
    }

    const scriptLoaded = await loadRazorpayCheckoutScript();

    if (!scriptLoaded || !window.Razorpay) {
      alert("Payment checkout could not load. Please check your internet connection and try again.");
      setActionLoading(null);
      return;
    }

    const checkout = new window.Razorpay({
      key: data.key_id,
      amount: data.amount,
      currency: data.currency || "INR",
      name: "HaveIt",
      description: `Borrowing: ${request.item?.name || "Item"}`,
      order_id: data.order_id,
      prefill: {
        email: session.user.email || "",
      },
      notes: {
        request_id: request.id,
      },
      theme: {
        color: "#2f6b3e",
      },
      handler: async (response) => {
        setActionLoading(request.id);

        const { data: verification, error: verificationError } =
          await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              request_id: request.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            },
          });

        if (verificationError || !verification?.verified) {
          console.error(
            "Razorpay verification error:",
            verificationError || verification
          );
          alert(
            verificationError?.message ||
              verification?.error ||
              "Payment was received but could not be verified yet. Please do not pay again; refresh and check the request status."
          );
          await loadRequests();
          setActionLoading(null);
          return;
        }

        await loadRequests();
        setActionLoading(null);
        onSuccess("Payment confirmed. The borrowing is now active.");
      },
      modal: {
        ondismiss: () => {
          setActionLoading(null);
        },
      },
    });

    checkout.on("payment.failed", (response) => {
      console.error("Razorpay payment failed:", response);
      setActionLoading(null);
      alert(
        response?.error?.description ||
          "Payment failed. No payment was recorded."
      );
    });

    checkout.open();
  }

  async function markReturned(request) {
    setActionLoading(request.id);

    const { error } = await supabase.rpc("mark_borrow_returned", {
      request_id: request.id,
    });

    if (error) {
      console.error("Return request error:", error);
      alert(error.message);
      setActionLoading(null);
      return;
    }

    await loadRequests();
    setActionLoading(null);
    onSuccess("Item marked as returned. It's available to borrow again.");
  }

  async function closeNeed(need) {
    setActionLoading(`need-${need.id}`);

    const { error } = await supabase
      .from("needs")
      .update({ status: "closed" })
      .eq("id", need.id)
      .eq("requester_id", session.user.id);

    if (error) {
      console.error("Close need error:", error);
      alert(error.message);
      setActionLoading(null);
      return;
    }

    await loadRequests();
    setActionLoading(null);
    onSuccess("Your need has been closed.");
  }

  async function requestRefund(request) {
    const reason = window.prompt("Why are you requesting a refund?", "The borrowing could not be completed as expected.");
    if (reason === null) return;
    const { data, error } = await supabase.rpc("create_refund_request_v1", { request_id_value: request.id, reason_value: reason.trim() || "Refund requested" });
    if (error) { alert(error.message); return; }
    onRefundRequested?.(data?.message || "Refund request submitted.");
    await loadRequests();
  }

  const historyRequests = [...sentRequests, ...receivedRequests]
    .filter((request, index, rows) => rows.findIndex((row) => row.id === request.id) === index)
    .filter((request) => ["returned", "declined", "cancelled"].includes(request.status));
  const activeRequests = tab === "received" ? receivedRequests : tab === "sent" ? sentRequests : historyRequests;

  return (
    <div className="modal-backdrop">
      <div className="requests-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="requests-header">
          <div className="requests-header-icon">
            <Inbox size={23} />
          </div>
          <div>
            <div className="details-eyebrow">BORROWING ACTIVITY</div>
            <h2>Requests</h2>
            <p>Track borrowing, payments, returns and your posted needs.</p>
          </div>
        </div>

        {loadError && (
          <div className="requests-load-error">
            <strong>Requests could not be loaded completely.</strong>
            <span>{loadError}</span>
            <button type="button" onClick={loadRequests}>Retry</button>
          </div>
        )}

        <div className="request-tabs request-tabs-four">
          <button className={tab === "received" ? "active" : ""} onClick={() => setTab("received")}>
            <Inbox size={16} /> Received
            {receivedRequests.length > 0 && <span>{receivedRequests.length}</span>}
          </button>
          <button className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>
            <Send size={16} /> My requests
            {sentRequests.length > 0 && <span>{sentRequests.length}</span>}
          </button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
            <History size={16} /> History
            {historyRequests.length > 0 && <span>{historyRequests.length}</span>}
          </button>
          <button className={tab === "needs" ? "active" : ""} onClick={() => setTab("needs")}>
            <Search size={16} /> My needs
            {needs.filter((need) => need.status === "open").length > 0 && <span>{needs.filter((need) => need.status === "open").length}</span>}
          </button>
        </div>

        {loading ? (
          <div className="requests-loading">
            <LoaderCircle size={27} className="location-spin" />
            <span>Loading your activity...</span>
          </div>
        ) : tab === "needs" ? (
          needs.length === 0 ? (
            <div className="requests-empty">
              <div><Search size={27} /></div>
              <h3>No needs posted yet</h3>
              <p>Use “Post a Need” when you can't find the item you need.</p>
            </div>
          ) : (
            <div className="requests-list">
              {needs.map((need) => (
                <NeedRow
                  key={need.id}
                  need={need}
                  loading={actionLoading === `need-${need.id}`}
                  onClose={() => closeNeed(need)}
                  onRequestItem={onRequestItem}
                />
              ))}
            </div>
          )
        ) : activeRequests.length === 0 ? (
          <div className="requests-empty">
            <div>{tab === "received" ? <Inbox size={27} /> : <Send size={27} />}</div>
            <h3>
              {tab === "received" ? "No requests yet" : tab === "history" ? "No completed history yet" : "You haven't requested anything"}
            </h3>
            <p>
              {tab === "received"
                ? "When someone wants to borrow one of your items, their request will appear here."
                : tab === "history"
                ? "Returned, cancelled and declined borrowings will collect here."
                : "When you request an item, you can track it here."}
            </p>
          </div>
        ) : (
          <div className="requests-list">
            {activeRequests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                received={tab === "received"}
                currentUserId={session.user.id}
                actionLoading={actionLoading}
                onAccept={() => updateRequestStatus(request.id, "accepted")}
                onDecline={() => updateRequestStatus(request.id, "declined")}
                onCancel={() => updateRequestStatus(request.id, "cancelled")}
                onPay={() => startPayment(request)}
                onChat={() => onChat(request)}
                onContact={() => onContact(request)}
                onReturn={() => markReturned(request)}
                onReview={() => setReviewRequest(request)}
                onRequestItem={() => request.item && onRequestItem?.(request.item)}
                onReport={() => onReport({ targetType: "user", targetId: request.borrower_id === session.user.id ? request.owner_id : request.borrower_id })}
                onRefund={() => requestRefund(request)}
              />
            ))}
          </div>
        )}

        {reviewRequest && (
          <ReviewModal
            request={reviewRequest}
            session={session}
            onClose={() => setReviewRequest(null)}
            onSuccess={(message) => {
              setReviewRequest(null);
              loadRequests();
              onSuccess(message);
            }}
          />
        )}
      </div>
    </div>
  );
}

function RequestRow({
  request,
  received,
  currentUserId,
  actionLoading,
  onAccept,
  onDecline,
  onCancel,
  onPay,
  onChat,
  onContact,
  onReturn,
  onReview,
  onRequestItem,
  onReport,
  onRefund,
}) {
  const item = request.item;
  const isOwner = request.owner_id === currentUserId;
  const counterpartId = isOwner ? request.borrower_id : request.owner_id;
  const status = String(request.status || "").toLowerCase();

  return (
    <div className="request-row">
      <div className="request-row-main">
        <div className="request-item-icon">
          {item?.image_url ? (
            <img src={item.image_url} alt={item.name} />
          ) : (
            getCategoryIcon(item?.category || "Other")
          )}
        </div>

        <div className="request-row-info">
          <div className="request-row-top">
            <strong>{item?.name || "Item unavailable"}</strong>
            <RequestStatus status={request.status} />
          </div>

          <span className="request-category">{item?.category || "Item"}</span>

          <div className="request-dates">
            <CalendarDays size={14} />
            {formatRequestDate(request.start_date)}
            <span>→</span>
            {formatRequestDate(request.end_date)}
          </div>

          <div className="request-created">
            Requested {formatRequestDate(request.created_at)}
          </div>
        </div>
      </div>

      {status === "pending" && (
        <div className="request-actions">
          {isOwner ? (
            <>
              <button className="accept-request-button" onClick={onAccept} disabled={actionLoading === request.id}>
                {actionLoading === request.id ? <LoaderCircle size={15} className="location-spin" /> : <Check size={15} />}
                Accept
              </button>
              <button className="decline-request-button" onClick={onDecline} disabled={actionLoading === request.id}>
                <Ban size={15} /> Decline
              </button>
            </>
          ) : (
            <button className="cancel-request-button" onClick={onCancel} disabled={actionLoading === request.id}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      )}

      {status === "accepted" && (
        <div className="accepted-actions">
          {item?.lending_type === "paid" && request.payment_status === "pending" ? (
            <>
              <div className="accepted-label payment-pending-label">
                <CreditCard size={15} />
                {isOwner
                  ? `Waiting for borrower payment · ${formatInrFromPaise(request.payment_amount_paise)}`
                  : `Payment required · ${formatInrFromPaise(request.payment_amount_paise)}`}
              </div>
              <div className="contact-actions request-action-grid">
                {!isOwner && (
                  <button
                    className="contact-button pay-button"
                    type="button"
                    onClick={onPay}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? (
                      <LoaderCircle size={15} className="location-spin" />
                    ) : (
                      <CreditCard size={15} />
                    )}
                    {actionLoading === request.id
                      ? "Opening payment..."
                      : `Pay ${formatInrFromPaise(request.payment_amount_paise)}`}
                  </button>
                )}
                <button className="contact-button" type="button" onClick={onChat}>
                  <MessageCircle size={15} /> Chat
                </button>
                <button className="contact-button secondary" type="button" onClick={onContact}>
                  <Mail size={15} /> Contact
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="accepted-label">
                <CheckCircle2 size={15} />
                Payment confirmed — borrowing is starting
              </div>
              <div className="contact-actions request-action-grid">
                <button className="contact-button" type="button" onClick={onChat}>
                  <MessageCircle size={15} /> Chat
                </button>
                <button className="contact-button secondary" type="button" onClick={onContact}>
                  <Mail size={15} /> Contact
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {status === "active" && (
        <div className="accepted-actions">
          <div className="accepted-label">
            <CheckCircle2 size={15} /> Borrowing is active
          </div>
          <div className="contact-actions request-action-grid">
            <button className="contact-button" type="button" onClick={onReturn} disabled={actionLoading === request.id}>
              {actionLoading === request.id ? <LoaderCircle size={15} className="location-spin" /> : <RotateCcw size={15} />}
              Mark returned
            </button>
            <button className="contact-button" type="button" onClick={onChat}>
              <MessageCircle size={15} /> Chat
            </button>
            <button className="contact-button secondary" type="button" onClick={onContact}>
              <Mail size={15} /> Contact
            </button>
          </div>
        </div>
      )}

      {status === "returned" && (
        <div className="accepted-actions">
          <div className="accepted-label">
            <CheckCircle2 size={15} /> Returned — leave a review
          </div>
          <div className="contact-actions request-action-grid">
            <button className="contact-button" type="button" onClick={onReview}>
              <Star size={15} /> Review
            </button>
            {item?.is_available !== false && onRequestItem && (
              <button className="contact-button" type="button" onClick={onRequestItem}>
                <Repeat2 size={15} /> Borrow again
              </button>
            )}
            <button className="contact-button" type="button" onClick={onChat}>
              <MessageCircle size={15} /> Chat
            </button>
            <button className="contact-button secondary" type="button" onClick={onContact}>
              <Mail size={15} /> Contact
            </button>
            {!isOwner && request.payment_status === "paid" && (
              <button className="contact-button secondary" type="button" onClick={() => onRefund(request)}>
                <RotateCcw size={15} /> Refund
              </button>
            )}
          </div>
        </div>
      )}

      {counterpartId && counterpartId !== currentUserId && (
        <div className="request-safety-row">
          <button type="button" onClick={onReport}><Flag size={13} /> Report user</button>
        </div>
      )}
    </div>
  );
}

function NeedRow({ need, loading, onClose, onRequestItem }) {
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadOffers() {
      if (!need?.id) return;
      setOffersLoading(true);
      const { data, error } = await supabase
        .from("need_offers")
        .select("id, item_id, owner_id, created_at")
        .eq("need_id", need.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Need offers load error:", error);
        if (mounted) setOffers([]);
        setOffersLoading(false);
        return;
      }
      const itemIds = (data || []).map((offer) => offer.item_id);
      if (!itemIds.length) {
        if (mounted) setOffers([]);
        setOffersLoading(false);
        return;
      }
      const { data: itemRows } = await supabase
        .from("items")
        .select("id, name, category, image_url, lending_type, price_per_day, is_available")
        .in("id", itemIds);
      const itemMap = new globalThis.Map((itemRows || []).map((item) => [item.id, item]));
      if (mounted) setOffers((data || []).map((offer) => ({ ...offer, item: itemMap.get(offer.item_id) || null })));
      setOffersLoading(false);
    }
    loadOffers();
    return () => { mounted = false; };
  }, [need?.id]);

  return (
    <div className="need-row upgraded-need-row">
      <div className="need-row-main">
        <div className="need-row-icon"><Search size={20} /></div>
        <div>
          <div className="request-row-top">
            <strong>{need.item_name}</strong>
            <span className={`need-status need-status-${need.status}`}>{need.status}</span>
          </div>
          <span className="request-category">{need.category || "Other"} · within {need.max_distance_km} km</span>
          <div className="request-dates"><CalendarDays size={14} /> {formatRequestDate(need.needed_from)} <span>→</span> {formatRequestDate(need.needed_until)}</div>
        </div>
      </div>

      <div className="need-offers-panel">
        <div className="need-offers-title"><span>Matches / offers</span><strong>{offersLoading ? "…" : offers.length}</strong></div>
        {!offersLoading && offers.length > 0 ? (
          <div className="need-offers-list">
            {offers.slice(0, 3).map((offer) => (
              <button
                key={offer.id}
                type="button"
                className="need-offer-mini-card"
                disabled={!offer.item?.is_available}
                onClick={() => offer.item && onRequestItem?.(offer.item)}
              >
                <div className="need-offer-mini-image">
                  {offer.item?.image_url ? <img src={offer.item.image_url} alt="" /> : getCategoryIcon(offer.item?.category || "Other")}
                </div>
                <div><strong>{offer.item?.name || "Item"}</strong><span>{offer.item?.lending_type === "paid" && offer.item?.price_per_day ? `₹${offer.item.price_per_day}/day` : "Free"}</span></div>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        ) : (
          <p className="need-offer-empty">No offers yet. Nearby owners can match this need.</p>
        )}
      </div>

      {need.status === "open" && (
        <div className="request-actions">
          <button className="cancel-request-button" onClick={onClose} disabled={loading}>
            {loading ? <LoaderCircle size={15} className="location-spin" /> : <X size={15} />}
            Close need
          </button>
        </div>
      )}
    </div>
  );
}
function ReviewModal({ request, session, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [returnedOnTime, setReturnedOnTime] = useState(true);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reviewedUserId =
    request.borrower_id === session.user.id
      ? request.owner_id
      : request.borrower_id;

  async function submitReview(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { data: existing, error: existingError } = await supabase
      .from("reviews")
      .select("id")
      .eq("transaction_id", request.id)
      .eq("reviewer_id", session.user.id)
      .maybeSingle();

    if (existingError) {
      setErrorMessage(existingError.message);
      setLoading(false);
      return;
    }

    if (existing) {
      setErrorMessage("You have already reviewed this borrowing.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      transaction_id: request.id,
      reviewer_id: session.user.id,
      reviewed_user_id: reviewedUserId,
      rating,
      returned_on_time: returnedOnTime,
      comment: comment.trim() || null,
    });

    if (error) {
      console.error("Review insert error:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    onSuccess("Thanks — your review has been added.");
  }

  return (
    <div className="modal-backdrop review-backdrop">
      <div className="modal review-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="modal-icon"><Star size={25} /></div>
        <div className="request-item-label">AFTER BORROWING</div>
        <h2>How did it go?</h2>
        <p className="modal-subtitle">Your review helps the next neighbour decide who they can trust.</p>

        <form onSubmit={submitReview}>
          <div className="star-rating" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" className={value <= rating ? "active" : ""} onClick={() => setRating(value)} aria-label={`${value} star rating`}>
                <Star size={27} fill="currentColor" />
              </button>
            ))}
          </div>

          <div className="review-choice-card">
            <div>
              <strong>Was it returned on time?</strong>
              <span>This helps build the reliability score.</span>
            </div>
            <div className="review-choice-buttons">
              <button type="button" className={returnedOnTime ? "selected" : ""} onClick={() => setReturnedOnTime(true)}>Yes</button>
              <button type="button" className={!returnedOnTime ? "selected no" : ""} onClick={() => setReturnedOnTime(false)}>No</button>
            </div>
          </div>

          <label>
            Comment <span className="optional-label">Optional</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={500} placeholder="Share a short note about the borrowing..." />
          </label>

          {errorMessage && <div className="form-error">{errorMessage}</div>}
          <button className="modal-submit" type="submit" disabled={loading}>
            {loading ? "Saving review..." : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatModal({ request, session, onClose }) {
  const [messages, setMessages] = useState([]);
  const [requestData, setRequestData] = useState(request);
  const [otherProfile, setOtherProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const otherUserId =
    requestData?.borrower_id === session.user.id
      ? requestData?.owner_id
      : requestData?.borrower_id;

  async function loadChat() {
    if (!request?.id) return;

    setErrorMessage("");

    const { data: br, error: requestError } =
      await supabase
        .from("borrow_requests")
        .select(
          "id, item_id, borrower_id, owner_id, status, start_date, end_date"
        )
        .eq("id", request.id)
        .single();

    if (requestError) {
      console.error("Chat request lookup error:", requestError);
      setErrorMessage(requestError.message);
      setLoading(false);
      return;
    }

    if (
      !["accepted", "active", "returned"].includes(
        br.status
      ) ||
      (br.borrower_id !== session.user.id &&
        br.owner_id !== session.user.id)
    ) {
      setErrorMessage(
        "Chat is available only after the request is accepted."
      );
      setLoading(false);
      return;
    }

    setRequestData({ ...request, ...br });

    const otherId =
      br.borrower_id === session.user.id
        ? br.owner_id
        : br.borrower_id;

    const [{ data: messageRows, error: messageError }, profileResponse] =
      await Promise.all([
        supabase
          .from("messages")
          .select(
            "id, sender_id, receiver_id, message, created_at"
          )
          .eq("borrow_request_id", br.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, name")
          .eq("id", otherId)
          .maybeSingle(),
      ]);

    if (messageError) {
      console.error("Chat messages error:", messageError);
      setErrorMessage(messageError.message);
    } else {
      setMessages(messageRows || []);
    }

    if (profileResponse.data) {
      setOtherProfile(profileResponse.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadChat();

    const channel = supabase
      .channel(`haveit-chat-${request.id}-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `borrow_request_id=eq.${request.id}`,
        },
        (payload) => {
          const incoming = payload.new;
          setMessages((current) => {
            if (current.some((item) => item.id === incoming.id)) {
              return current;
            }
            return [...current, incoming];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Chat realtime subscription failed.");
        }
      });

    const refreshTimer = window.setInterval(() => {
      loadChat();
    }, 5000);

    return () => {
      window.clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [request.id, session.user.id]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = messageText.trim();
    if (!text || sending || !otherUserId) return;

    setSending(true);
    setErrorMessage("");

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      sender_id: session.user.id,
      receiver_id: otherUserId,
      message: text,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessageText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        borrow_request_id: requestData.id,
        sender_id: session.user.id,
        receiver_id: otherUserId,
        message: text,
      })
      .select(
        "id, sender_id, receiver_id, message, created_at"
      )
      .single();

    if (error) {
      console.error("Send message error:", error);
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId)
      );
      setMessageText(text);
      setErrorMessage(
        `Message could not be sent: ${error.message}`
      );
      setSending(false);
      return;
    }

    setMessages((current) =>
      current
        .filter((item) => item.id !== optimisticId)
        .some((item) => item.id === data.id)
        ? current
        : [
            ...current.filter(
              (item) => item.id !== optimisticId
            ),
            data,
          ]
    );

    setSending(false);
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const displayName =
    otherProfile?.name ||
    (requestData?.borrower_id === session.user.id
      ? "Item owner"
      : "Borrower");

  return (
    <div className="modal-backdrop chat-backdrop">
      <div className="chat-modal" role="dialog" aria-modal="true">
        <div className="chat-header">
          <div className="chat-header-main">
            <div className="chat-header-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="chat-header-copy">
              <span>PRIVATE CHAT</span>
              <strong>{displayName}</strong>
              <small>{request.item?.name || "HaveIt item"}</small>
            </div>
          </div>

          <button
            className="chat-close"
            type="button"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X size={19} />
          </button>
        </div>

        <div className="chat-privacy-note">
          <ShieldCheck size={15} />
          <span>Only you and the other participant can see this chat.</span>
        </div>

        <div className="chat-messages">
          {loading ? (
            <div className="chat-state">
              <LoaderCircle size={23} className="location-spin" />
              <span>Loading conversation...</span>
            </div>
          ) : errorMessage && messages.length === 0 ? (
            <div className="chat-state chat-error-state">
              <MessageCircle size={25} />
              <strong>Chat couldn't load</strong>
              <span>{errorMessage}</span>
              <button type="button" onClick={loadChat}>
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-state">
              <div className="chat-empty-icon">
                <MessageCircle size={24} />
              </div>
              <strong>Start the conversation</strong>
              <span>Confirm pickup details, timing, or anything else about the borrowing.</span>
            </div>
          ) : (
            messages.map((message) => {
              const mine =
                message.sender_id === session.user.id;

              return (
                <div
                  className={`chat-message ${
                    mine ? "mine" : "theirs"
                  }`}
                  key={message.id}
                >
                  <div className="chat-bubble">
                    <p>{message.message}</p>
                    <time>{formatTime(message.created_at)}</time>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {errorMessage && messages.length > 0 && (
          <div className="chat-send-error">{errorMessage}</div>
        )}

        <form className="chat-composer" onSubmit={sendMessage}>
          <input
            type="text"
            value={messageText}
            onChange={(event) =>
              setMessageText(event.target.value)
            }
            placeholder="Write a message..."
            maxLength={1000}
            disabled={loading || sending || !otherUserId}
          />

          <button
            type="submit"
            disabled={
              loading ||
              sending ||
              !messageText.trim() ||
              !otherUserId
            }
          >
            {sending ? (
              <LoaderCircle
                size={17}
                className="location-spin"
              />
            ) : (
              <Send size={17} />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function RequestStatus({ status }) {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    active: "Active",
    returned: "Returned",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`request-status status-${status}`}
    >
      {labels[status] || status}
    </span>
  );
}

function AuthModal({
  mode,
  setMode,
  onClose,
  onSuccess,
  onAdminSuccess,
  onInstall,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    if (mode === "signup") {
      const { error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      onSuccess();
      setLoading(false);
      return;
    }

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (adminMode) {
      const { data: adminStatus, error: adminError } =
        await supabase.rpc("get_my_admin_status_v1");

      if (adminError || !adminStatus) {
        await supabase.auth.signOut();
        setErrorMessage("This account does not have HaveIt admin access.");
        setLoading(false);
        return;
      }

      onAdminSuccess();
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button
          className="modal-close"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="modal-icon">
          {mode === "login"
            ? "👋"
            : "🏡"}
        </div>

        <h2>
          {adminMode && mode === "login"
            ? "HaveIt Admin"
            : mode === "login"
            ? "Welcome back"
            : "Join HaveIt"}
        </h2>

        <p className="modal-subtitle">
          {adminMode && mode === "login"
            ? "Secure sign in for authorised HaveIt administrators."
            : mode === "login"
            ? "Log in to borrow and lend items nearby."
            : "Create an account and start sharing with your neighbourhood."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Name

              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                required
              />
            </label>
          )}

          <label>
            Email

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={6}
              required
            />
          </label>

          {errorMessage && (
            <div className="form-error">
              {errorMessage}
            </div>
          )}

          <button
            className="modal-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>

        <div className="modal-switch">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            onClick={() => {
              setAdminMode(false);
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login"
              ? "Sign up"
              : "Log in"}
          </button>
        </div>

        {mode === "login" && (
          <div className="auth-extra-actions">
            <button
              type="button"
              className="auth-install-button"
              onClick={onInstall}
            >
              <Download size={14} />
              Install HaveIt
            </button>
            <button
              type="button"
              className="auth-admin-link"
              onClick={() => {
                setAdminMode((current) => !current);
                setErrorMessage("");
              }}
            >
              <ShieldAlert size={14} />
              {adminMode ? "Back to normal login" : "Admin access"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddItemModal({ location, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tools");
  const [condition, setCondition] = useState("Good");
  const [description, setDescription] = useState("");
  const [lendingType, setLendingType] = useState("free");
  const [pricePerDay, setPricePerDay] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleFileChange(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be 5 MB or smaller.");
      return;
    }

    setErrorMessage("");
    setPreparingImage(true);

    try {
      // Android Chrome/PWA can revoke the original picker File reference
      // after the file chooser closes. Copy the bytes immediately while the
      // reference is fresh, then keep only an in-memory File for later upload.
      const sourceBuffer = await file.arrayBuffer();
      const stableFile = new File([sourceBuffer], file.name || "haveit-image", {
        type: file.type || "image/jpeg",
        lastModified: Date.now(),
      });

      // Normalize now, not when the user eventually taps List item. This means
      // the submit step never touches the Android picker File again.
      const preparedFile = await prepareImageForUpload(stableFile);
      const previewUrl = URL.createObjectURL(preparedFile);

      setImageFile(preparedFile);
      setImagePreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return previewUrl;
      });
    } catch (error) {
      console.error("Image selection/read error:", error);
      setImageFile(null);
      setImagePreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return "";
      });
      setErrorMessage(
        error?.name === "NotReadableError"
          ? "Your phone did not grant the browser a readable copy of that photo. Please choose the photo again from Gallery/Photos."
          : error?.message || "Could not prepare that photo. Please choose another image."
      );
    } finally {
      setPreparingImage(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    if (!name.trim()) return setErrorMessage("Please enter an item name.");
    if (lendingType === "paid" && (!pricePerDay || Number(pricePerDay) <= 0)) return setErrorMessage("Enter a valid price per day.");
    if (availableFrom && availableUntil && availableUntil < availableFrom) return setErrorMessage("Availability end date must be on or after the start date.");
    setLoading(true);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      setErrorMessage("Please log in again.");
      setLoading(false);
      return;
    }

    let imageUrl = null;
    if (imageFile) {
      try {
        // imageFile is already a memory-backed, normalized File prepared when
        // the user selected the photo. Do not re-read the Android picker file.
        const uploadFile = imageFile;
        const filePath = `${currentSession.user.id}/items/${crypto.randomUUID()}.jpg`;
        const uploadBody = await uploadFile.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("haveit-images")
          .upload(filePath, uploadBody, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          console.error("Item image upload error:", uploadError, {
            message: uploadError.message,
            status: uploadError.status,
            statusCode: uploadError.statusCode,
          });
          setErrorMessage(
            uploadError.message ||
              "Unable to upload the image. Please check your connection and try again."
          );
          setLoading(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("haveit-images")
          .getPublicUrl(filePath);
        imageUrl = publicData?.publicUrl || null;
      } catch (uploadException) {
        console.error("Item image upload exception:", uploadException);
        setErrorMessage(
          uploadException?.message ||
            "The image could not be uploaded. Please try a JPG or PNG image again."
        );
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from("items").insert({
      owner_id: currentSession.user.id,
      name: name.trim(),
      description: description.trim() || null,
      category,
      condition,
      image_url: imageUrl,
      available_from: availableFrom ? `${availableFrom}T00:00:00` : null,
      available_until: availableUntil ? `${availableUntil}T23:59:59` : null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      lending_type: lendingType,
      price_per_day: lendingType === "paid" && pricePerDay ? Number(pricePerDay) : null,
      is_available: true,
    });

    if (error) {
      console.error("Item insert error:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal add-item-modal upgraded-form-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="modal-icon"><PackagePlus size={26} /></div>
        <h2>List an item</h2>
        <p className="modal-subtitle">Make something useful available to your neighbourhood.</p>

        <form onSubmit={handleSubmit}>
          <label>Item name<input type="text" placeholder="e.g. Cordless drill" value={name} onChange={(event) => setName(event.target.value)} required /></label>

          <div className="form-row">
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Excellent</option><option>Good</option><option>Fair</option></select></label>
          </div>

          <label>Description<textarea placeholder="Tell people a little about the item..." value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>

          <label className="image-upload-control">
            <span>Item photo <small>optional · up to 5 MB</small></span>
            <div className="image-upload-dropzone">
              {imagePreview ? <img src={imagePreview} alt="Preview" /> : <><ImagePlus size={22} /><strong>Add a clear photo</strong><span>JPG, PNG, WEBP</span></>}
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          </label>

          <div className="lending-type-row">
            <button type="button" className={`lending-type ${lendingType === "free" ? "active" : ""}`} onClick={() => setLendingType("free")}>Free</button>
            <button type="button" className={`lending-type ${lendingType === "paid" ? "active" : ""}`} onClick={() => setLendingType("paid")}>Paid</button>
          </div>

          {lendingType === "paid" && <label>Price per day<input type="number" min="1" placeholder="e.g. 100" value={pricePerDay} onChange={(event) => setPricePerDay(event.target.value)} required /></label>}

          <div className="availability-editor-card">
            <div className="availability-editor-header"><CalendarClock size={17} /><div><strong>Availability</strong><span>Optional window for when people can request it.</span></div></div>
            <div className="form-row">
              <label>Available from<input type="date" min={getTodayString()} value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} /></label>
              <label>Available until<input type="date" min={availableFrom || getTodayString()} value={availableUntil} onChange={(event) => setAvailableUntil(event.target.value)} /></label>
            </div>
          </div>

          <div className="location-notice"><MapPin size={16} />{location ? "Approximate distance will be calculated from your saved location." : "Location isn't enabled. The item can still be listed."}</div>
          {errorMessage && <div className="form-error">{errorMessage}</div>}
          <button className="modal-submit" type="submit" disabled={loading || preparingImage}>{
            preparingImage ? "Preparing photo..." : loading ? "Listing..." : "List item"
          }</button>
        </form>
      </div>
    </div>
  );
}
function NotificationPopover({ notifications, unreadCount, onClose, onMarkRead, onMarkAllRead, onOpenRequest }) {
  return (
    <div className="notification-popover">
      <div className="notification-popover-header">
        <div>
          <span>YOUR ACTIVITY</span>
          <h3>Notifications</h3>
        </div>
        <div className="notification-head-actions">
          {unreadCount > 0 && <button type="button" onClick={onMarkAllRead}>Mark all read</button>}
          <button type="button" className="notification-close" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty"><BellRing size={22} /><strong>You're all caught up</strong><span>Requests, messages and updates will appear here.</span></div>
        ) : (
          notifications.slice(0, 15).map((notification) => (
            <button
              type="button"
              className={`notification-row ${notification.read_at ? "" : "unread"}`}
              key={notification.id}
              onClick={async () => {
                if (!notification.read_at) await onMarkRead(notification.id);
                onOpenRequest(notification);
              }}
            >
              <div className={`notification-dot notification-dot-${notification.type || "system"}`} />
              <div className="notification-copy"><strong>{notification.title}</strong><span>{notification.message}</span><small>{formatRequestDate(notification.created_at)}</small></div>
              {!notification.read_at && <span className="notification-unread-dot" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardModal({ session, profile, items, favoriteIds, blockedUserIds, waitlistedIds, onClose, onOpenItem, onRequest, onFavorite, onAvailability, onUnblock, onWaitlist, onItemsChanged }) {
  const [tab, setTab] = useState("overview");
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [activity, setActivity] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadActivity() {
      setLoading(true);
      const [sent, received, ownedItems, savedRows] = await Promise.all([
        supabase.from("borrow_requests").select("id, item_id, borrower_id, owner_id, start_date, end_date, status, payment_status, payment_amount_paise, created_at").eq("borrower_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("borrow_requests").select("id, item_id, borrower_id, owner_id, start_date, end_date, status, payment_status, payment_amount_paise, created_at").eq("owner_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("items").select("*").eq("owner_id", session.user.id).order("created_at", { ascending: false }),
        supabase.rpc("get_my_favorite_items_v1"),
      ]);
      const rows = [...(sent.data || []), ...(received.data || [])].filter((row, index, arr) => arr.findIndex((candidate) => candidate.id === row.id) === index);
      const itemIds = [...new Set(rows.map((row) => row.item_id))];
      let itemMap = new globalThis.Map();
      if (itemIds.length) {
        const { data } = await supabase.from("items").select("id, name, image_url, category, lending_type, price_per_day").in("id", itemIds);
        itemMap = new globalThis.Map((data || []).map((item) => [item.id, item]));
      }
      if (mounted) {
        setActivity(rows.map((row) => ({ ...row, item: itemMap.get(row.item_id) || null })));
        setMyItems(ownedItems.data || []);
        setFavoriteItems(savedRows.data || []);
      }
      if (mounted) setLoading(false);
    }
    loadActivity();
    return () => { mounted = false; };
  }, [session.user.id]);

  async function deleteMyItem(item) {
    const confirmed = window.confirm(`Delete “${item.name}” from HaveIt? This will remove the listing from the marketplace.`);
    if (!confirmed) return;

    setDeletingItemId(item.id);
    const { error } = await supabase.rpc("delete_my_item_v1", { item_id_value: item.id });
    if (error) {
      alert(error.message || "Unable to delete the listing.");
      setDeletingItemId(null);
      return;
    }

    setMyItems((current) => current.filter((entry) => entry.id !== item.id));
    if (onItemsChanged) await onItemsChanged();
    setDeletingItemId(null);
  }

  const ownerRequests = activity.filter((row) => row.owner_id === session.user.id);
  const borrowerRequests = activity.filter((row) => row.borrower_id === session.user.id);
  const paidEarningsPaise = ownerRequests.reduce((sum, row) => sum + (row.payment_status === "paid" ? Number(row.payment_amount_paise || 0) : 0), 0);
  const history = activity.filter((row) => ["returned", "declined", "cancelled"].includes(row.status));
  const savedItems = favoriteItems.length ? favoriteItems : items.filter((item) => favoriteIds.includes(item.id));

  return (
    <div className="modal-backdrop">
      <div className="dashboard-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={19} /></button>
        <div className="dashboard-header">
          <div className="dashboard-title-block"><div className="details-eyebrow">YOUR HAVEIT</div><h2>Dashboard</h2><p>Everything you lend, borrow, save and manage in one place.</p></div>
          <div className="dashboard-profile-mini"><div className="dashboard-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.name || "U").charAt(0).toUpperCase()}</div><div><strong>{profile?.name || "HaveIt member"}</strong><span>{profile?.reliability_score ? `${Number(profile.reliability_score).toFixed(1)} reliability` : "New member"}</span></div></div>
        </div>

        <div className="dashboard-tabs">
          {[
            ["overview", <LayoutDashboard size={15} />, "Overview"],
            ["items", <Store size={15} />, "My items"],
            ["saved", <Heart size={15} />, "Saved"],
            ["history", <History size={15} />, "Activity"],
            ["safety", <ShieldCheck size={15} />, "Safety"],
          ].map(([key, icon, label]) => <button key={key} className={tab === key ? "active" : ""} type="button" onClick={() => setTab(key)}>{icon}{label}</button>)}
        </div>

        {tab === "overview" && (
          <div className="dashboard-content">
            <div className="dashboard-stat-grid">
              <div className="dashboard-stat"><span>Listed items</span><strong>{myItems.length}</strong><small>shared with your area</small></div>
              <div className="dashboard-stat"><span>Pending requests</span><strong>{ownerRequests.filter((row) => row.status === "pending").length}</strong><small>waiting for your decision</small></div>
              <div className="dashboard-stat"><span>Active borrows</span><strong>{activity.filter((row) => row.status === "active").length}</strong><small>currently in use</small></div>
              <div className="dashboard-stat accent"><span>Paid earnings</span><strong>{formatInrFromPaise(paidEarningsPaise)}</strong><small>confirmed payments</small></div>
            </div>
            <div className="dashboard-action-grid">
              <button type="button" onClick={() => setTab("items")}><PackagePlus size={18} /><strong>Manage my items</strong><span>Edit availability and photos.</span></button>
              <button type="button" onClick={() => setTab("saved")}><Heart size={18} /><strong>Saved items</strong><span>{savedItems.length} available right now.</span></button>
              <button type="button" onClick={() => setTab("history")}><History size={18} /><strong>Transaction history</strong><span>Completed, cancelled and past borrows.</span></button>
            </div>
          </div>
        )}

        {tab === "items" && (
          <div className="dashboard-list-section">
            <div className="dashboard-list-header"><div><strong>My listed items</strong><span>Only you can edit these.</span></div><span>{myItems.length} items</span></div>
            {myItems.length === 0 ? <div className="dashboard-empty"><PackagePlus size={24} /><strong>You haven't listed anything yet.</strong><span>Use “List an Item” to start sharing.</span></div> : (
              <div className="dashboard-item-list">
                {myItems.map((item) => (
                  <div className="dashboard-item-row" key={item.id}>
                    <div className="dashboard-item-image">{item.image_url ? <img src={item.image_url} alt="" /> : getCategoryIcon(item.category)}</div>
                    <div className="dashboard-item-copy"><strong>{item.name}</strong><span>{item.category} · {item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}</span></div>
                    <span className={`dashboard-availability ${item.is_available ? "available" : "busy"}`}>{item.is_available ? "Available" : "Busy"}</span>
                    <button type="button" className="tiny-action" onClick={() => onAvailability(item)}><CalendarClock size={15} /> Calendar</button>
                    <button type="button" className="tiny-action secondary" onClick={() => onOpenItem(item)}>View</button>
                    <button type="button" className="tiny-action danger" onClick={() => deleteMyItem(item)} disabled={deletingItemId === item.id}>
                      {deletingItemId === item.id ? <LoaderCircle size={14} className="location-spin" /> : <Trash2 size={14} />}
                      {deletingItemId === item.id ? "Removing" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="dashboard-list-section">
            <div className="dashboard-list-header"><div><strong>Saved items</strong><span>Your shortlist of things you might borrow.</span></div><span>{savedItems.length} saved</span></div>
            {savedItems.length === 0 ? <div className="dashboard-empty"><Heart size={24} /><strong>No saved items yet.</strong><span>Tap the heart on any available listing to save it.</span></div> : (
              <div className="saved-grid">{savedItems.map((item) => item.is_available === false ? (
                <article className="saved-unavailable-card" key={item.id}>
                  <div className="saved-unavailable-image">{item.image_url ? <img src={item.image_url} alt="" /> : getCategoryIcon(item.category)}</div>
                  <div className="saved-unavailable-copy"><span className="item-category-pill">Saved · unavailable</span><strong>{item.name}</strong><span>{item.category || "Item"}</span></div>
                  <div className="saved-unavailable-actions"><button type="button" className="primary-button small-primary" onClick={() => onWaitlist(item.id)}><Bell size={14} /> {waitlistedIds.includes(item.id) ? "On waitlist" : "Notify me"}</button><button type="button" className="secondary-button small-primary" onClick={() => onOpenItem(item)}>View</button></div>
                </article>
              ) : (
                <ItemCard key={item.id} item={item} distance={null} isFavorite={favoriteIds.includes(item.id)} onFavorite={() => onFavorite(item.id)} onOpen={() => onOpenItem(item)} onRequest={() => onRequest(item)} onReport={() => {}} />
              ))}</div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="dashboard-list-section">
            <div className="dashboard-list-header"><div><strong>Transaction history</strong><span>Every borrowing stays visible here.</span></div><span>{history.length} past</span></div>
            {loading ? <div className="dashboard-empty"><LoaderCircle size={23} className="location-spin" /><span>Loading activity...</span></div> : history.length === 0 ? <div className="dashboard-empty"><History size={24} /><strong>No history yet.</strong><span>Completed and cancelled borrowings will appear here.</span></div> : (
              <div className="history-list">{history.map((row) => <div className="history-row" key={row.id}><div className="history-image">{row.item?.image_url ? <img src={row.item.image_url} alt="" /> : getCategoryIcon(row.item?.category || "Other")}</div><div className="history-copy"><strong>{row.item?.name || "Item"}</strong><span>{row.borrower_id === session.user.id ? "You borrowed" : "You lent"} · {formatRequestDate(row.start_date)} → {formatRequestDate(row.end_date)}</span></div><RequestStatus status={row.status} /><span className="history-amount">{row.payment_status === "paid" ? formatInrFromPaise(row.payment_amount_paise) : "Free"}</span>{row.borrower_id === session.user.id && row.item && <button type="button" className="tiny-action secondary" onClick={() => onRequest(row.item)} disabled={row.item.is_available === false}>Borrow again</button>}</div>)}</div>
            )}
          </div>
        )}

        {tab === "safety" && (
          <div className="dashboard-list-section">
            <div className="dashboard-list-header"><div><strong>Safety & privacy</strong><span>Manage reports and blocked accounts.</span></div><ShieldCheck size={20} /></div>
            <div className="safety-banner"><ShieldCheck size={18} /><div><strong>Exact locations stay private</strong><span>HaveIt only uses approximate distance until a borrowing relationship is accepted.</span></div></div>
            <div className="blocked-section"><strong>Blocked accounts</strong>{blockedUserIds.length === 0 ? <span>No blocked accounts.</span> : blockedUserIds.map((userId) => <div className="blocked-row" key={userId}><UserX size={15} /><span>Blocked account · {userId.slice(0, 8)}…</span><button type="button" onClick={() => onUnblock(userId)}>Unblock</button></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AvailabilityModal({ item, onClose, onSaved }) {
  const [availableFrom, setAvailableFrom] = useState(item.available_from ? item.available_from.slice(0, 10) : "");
  const [availableUntil, setAvailableUntil] = useState(item.available_until ? item.available_until.slice(0, 10) : "");
  const [blocks, setBlocks] = useState([]);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockNote, setBlockNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadBlocks(); }, [item.id]);

  async function loadBlocks() {
    const { data, error: loadError } = await supabase.from("item_availability_blocks").select("*").eq("item_id", item.id).order("start_date", { ascending: true });
    if (loadError) console.error("Availability block load error:", loadError);
    setBlocks(data || []);
  }

  async function saveWindow() {
    if (availableFrom && availableUntil && availableUntil < availableFrom) {
      setError("Availability end date must be on or after the start date.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.from("items").update({ available_from: availableFrom ? `${availableFrom}T00:00:00` : null, available_until: availableUntil ? `${availableUntil}T23:59:59` : null }).eq("id", item.id).eq("owner_id", item.owner_id);
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    await onSaved();
  }

  async function addBlock(event) {
    event.preventDefault();
    if (!blockStart || !blockEnd || blockEnd < blockStart) {
      setError("Choose a valid blocked date range.");
      return;
    }
    setBlockLoading(true);
    setError("");
    const { error: insertError } = await supabase.from("item_availability_blocks").insert({ item_id: item.id, owner_id: item.owner_id, start_date: blockStart, end_date: blockEnd, note: blockNote.trim() || null });
    if (insertError) setError(insertError.message);
    else { setBlockStart(""); setBlockEnd(""); setBlockNote(""); await loadBlocks(); }
    setBlockLoading(false);
  }

  async function deleteBlock(blockId) {
    const { error: deleteError } = await supabase.from("item_availability_blocks").delete().eq("id", blockId).eq("owner_id", item.owner_id);
    if (deleteError) setError(deleteError.message);
    else await loadBlocks();
  }

  return (
    <div className="modal-backdrop">
      <div className="availability-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={19} /></button>
        <div className="modal-icon"><CalendarClock size={23} /></div>
        <div className="modal-kicker">AVAILABILITY CALENDAR</div>
        <h2>{item.name}</h2>
        <p className="modal-subtitle">Set a general availability window and block dates when you cannot lend this item.</p>

        {error && <div className="form-error">{error}</div>}
        <div className="availability-window-grid"><label>Available from<input type="date" value={availableFrom} min={getTodayString()} onChange={(event) => setAvailableFrom(event.target.value)} /></label><label>Available until<input type="date" value={availableUntil} min={availableFrom || getTodayString()} onChange={(event) => setAvailableUntil(event.target.value)} /></label></div>
        <button className="modal-submit" type="button" disabled={loading} onClick={saveWindow}>{loading ? "Saving..." : "Save availability"}</button>

        <div className="calendar-block-section"><div className="calendar-block-heading"><div><strong>Blocked dates</strong><span>These ranges won't appear for date-based search.</span></div></div>
          <form className="block-date-form" onSubmit={addBlock}><input type="date" min={getTodayString()} value={blockStart} onChange={(event) => setBlockStart(event.target.value)} required /><span>to</span><input type="date" min={blockStart || getTodayString()} value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} required /><input value={blockNote} onChange={(event) => setBlockNote(event.target.value)} placeholder="Optional note" /><button type="submit" className="secondary-button" disabled={blockLoading}>{blockLoading ? "Adding..." : "Block dates"}</button></form>
          {blocks.length === 0 ? <div className="calendar-empty"><CalendarDays size={18} /><span>No blocked dates.</span></div> : <div className="block-list">{blocks.map((block) => <div className="block-row" key={block.id}><CalendarDays size={15} /><div><strong>{formatRequestDate(block.start_date)} → {formatRequestDate(block.end_date)}</strong><span>{block.note || "Unavailable"}</span></div><button type="button" onClick={() => deleteBlock(block.id)} aria-label="Delete blocked range"><Trash2 size={15} /></button></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function OfferNeedModal({ need, session, items, onClose, onSuccess }) {
  const ownedItems = items.filter((item) => item.owner_id === session.user.id && item.is_available !== false);
  const [selectedItemId, setSelectedItemId] = useState(ownedItems[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!selectedItemId) {
      setError("You need an available item to make an offer.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: insertError } = await supabase.from("need_offers").insert({ need_id: need.id, item_id: selectedItemId, owner_id: session.user.id });
    if (insertError) {
      if (String(insertError.message || "").toLowerCase().includes("duplicate")) setError("You've already offered this item for this need.");
      else setError(insertError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess("Offer sent. The requester can now see your matching item.");
  }

  return (
    <div className="modal-backdrop">
      <div className="modal offer-need-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={19} /></button>
        <div className="modal-icon"><ArrowRight size={23} /></div>
        <div className="modal-kicker">OFFER AN ITEM</div>
        <h2>{need.item_name}</h2>
        <p className="modal-subtitle">Choose one of your available items to let this requester know you can help.</p>
        {ownedItems.length === 0 ? <div className="dashboard-empty"><PackagePlus size={23} /><strong>No available items to offer.</strong><span>List an item first, then come back to this need.</span></div> : <form onSubmit={submit}>
          <div className="offer-item-picker">{ownedItems.map((item) => <button type="button" key={item.id} className={`offer-item-option ${selectedItemId === item.id ? "active" : ""}`} onClick={() => setSelectedItemId(item.id)}><div className="offer-option-image">{item.image_url ? <img src={item.image_url} alt="" /> : getCategoryIcon(item.category)}</div><div><strong>{item.name}</strong><span>{item.category} · {item.lending_type === "paid" && item.price_per_day ? `₹${item.price_per_day}/day` : "Free"}</span></div>{selectedItemId === item.id && <CheckCircle2 size={18} />}</button>)}</div>
          {error && <div className="form-error">{error}</div>}
          <button className="modal-submit" type="submit" disabled={loading}>{loading ? "Sending offer..." : "Offer selected item"}</button>
        </form>}
      </div>
    </div>
  );
}

function ReportModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState("Wrong or misleading listing");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(target.targetType === "user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const ok = await onSubmit({ targetType: target.targetType, targetId: target.targetId, reason, details, alsoBlock });
    if (!ok) setError("We couldn't record this report. Please try again.");
    setLoading(false);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal report-modal">
        <button className="modal-close" onClick={onClose} type="button"><X size={19} /></button>
        <div className="modal-icon"><Flag size={22} /></div>
        <div className="modal-kicker">SAFETY</div>
        <h2>Report this {target.targetType}.</h2>
        <p className="modal-subtitle">Tell us what went wrong. Reports stay attached to your account and are not shown publicly.</p>
        <form onSubmit={submit}>
          <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Wrong or misleading listing</option><option>Scam or suspicious behavior</option><option>Unsafe or inappropriate behavior</option><option>Payment problem</option><option>Item was not as described</option><option>Harassment</option><option>Other</option></select></label>
          <label>Details <span>(optional)</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} placeholder="Add any useful context..." /></label>
          {target.targetType === "user" && <label className="checkbox-row"><input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} /><span><strong>Block this user too</strong><small>They won't appear in your future discovery results.</small></span></label>}
          {error && <div className="form-error">{error}</div>}
          <button className="modal-submit danger-submit" type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit report"}</button>
        </form>
      </div>
    </div>
  );
}

export default App;
