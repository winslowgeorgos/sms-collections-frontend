"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation"; 
import { EscalationRecord, EscalationApiResponse } from "../../../types"; 
import { OUT_API_BASE_URL, AUTH_TOKEN_KEY, USER_KEY, USER_DETAILS_KEY } from "@/lib/constants";
import { retrieveAndDecrypt } from "@/utils/sec";
import {  
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  DollarSign, 
  Search,
  SlidersHorizontal,
  X,
  FileText,
  FileSpreadsheet,
  Calendar
} from "lucide-react";

type ViewMode = "my_escalations" | "all_escalations";

interface FilterState {
  assigned_officer: string;
  collection_conditions: string;
  auto_escalated: string;
  to_repossess: string;
  min_days_overdue: string;
  max_days_overdue: string;
  min_balance: string;
  max_balance: string;
  repossession_status: string; 
  trigger_type: string; 
  start_date: string; 
  end_date: string;   
}

const CONDITION_LABELS: Record<string, string> = {
  collectable: "Collectable",
  in_yard: "In the Yard",
  police_case: "Police Case",
  law_court: "Law Court",
  in_auction: "In Auctioneer",
  third_party: "Third Party Collection",
  restructured: "Restructured Plan",
  written_off: "Written Off",
  settled: "Settled",
};

export default function EscalationWorkspace() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <EscalationWorkspaceContent />
    </Suspense>
  );
}

function EscalationWorkspaceContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("my_escalations");
  const [rawApiData, setRawApiData] = useState<EscalationRecord[]>([]);
  const [displayData, setDisplayData] = useState<EscalationRecord[]>([]); 
  const [summary, setSummary] = useState<{ total_escalated: number; total_cumulative_balance: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false); 
  
  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    assigned_officer: "",
    collection_conditions: "",
    auto_escalated: "",
    to_repossess: "",
    min_days_overdue: "",
    max_days_overdue: "",
    min_balance: "",
    max_balance: "",
    repossession_status: "",  
    trigger_type: "",
    start_date: "",
    end_date: ""
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({ ...filters });
  
  const searchParams = useSearchParams();
  const activeTabUrl = searchParams.get("tab") || "all_escalations";

  const getAuthHeader = useCallback(async (): Promise<HeadersInit> => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    try {
      const tokenData = await retrieveAndDecrypt<any>(AUTH_TOKEN_KEY);
      const token = tokenData?.access || tokenData || '';
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }, []);

  const fetchEscalationData = useCallback(async () => {
  setLoading(true);
  try {
    let url = `${OUT_API_BASE_URL}/loan-processor/escalation/escalated-loans/?page=${page}&page_size=${pageSize}`;

    if (activeTabUrl === "my_escalations") {
      let officerId: string | null = null;
      try {
        const userDetails = await retrieveAndDecrypt<any>(USER_DETAILS_KEY);
        const user = userDetails?.user || await retrieveAndDecrypt<any>(USER_KEY);
        officerId = user?.id || user?.user_id || null;
      } catch (err) {
        console.error("Failed to decrypt officer context", err);
      }

      // If officerId is missing for "my_escalations", break early or log an error
      if (!officerId) {
        console.warn("Officer ID not found for 'my_escalations' tab.");
        // Optional: stop execution if backend requires officer_id for this tab
        // setLoading(false);
        // return;
      } else {
        url += `&officer_id=${officerId}`;
      }
    }

      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;

      if (filters.collection_conditions) url += `&collection_conditions=${encodeURIComponent(filters.collection_conditions)}`;
      if (filters.assigned_officer) url += `&officer_username=${encodeURIComponent(filters.assigned_officer.trim())}`;
      if (filters.auto_escalated) url += `&auto_escalated=${filters.auto_escalated}`;
      if (filters.to_repossess) url += `&to_repossess=${filters.to_repossess}`;
      
      if (filters.repossession_status) {
        url += `&include_repossessed=true`;
        url += `&repossession_status_filter=${encodeURIComponent(filters.repossession_status)}`;
      }
      
      if (filters.trigger_type) url += `&auto_escalated=${filters.trigger_type}`;
      if (filters.min_days_overdue) url += `&min_days_overdue=${filters.min_days_overdue}`;
      if (filters.max_days_overdue) url += `&max_days_overdue=${filters.max_days_overdue}`;
      if (filters.min_balance) url += `&min_balance=${filters.min_balance}`;
      if (filters.max_balance) url += `&max_balance=${filters.max_balance}`;
      
      if (filters.start_date) url += `&start_date=${filters.start_date}`;
      if (filters.end_date) url += `&end_date=${filters.end_date}`;

      const headers = await getAuthHeader();
      const response = await fetch(url, { 
        method: "GET", 
        headers
      });
      
      const payload: EscalationApiResponse = await response.json();
      const fetchedLoans = payload.loans || [];

      setRawApiData(fetchedLoans);
      setDisplayData(fetchedLoans);
      setTotalCount(payload.total_count || 0);
      setTotalPages(Math.ceil((payload.total_count || 0) / pageSize) || 1);
      setSummary(payload.summary || null);

    } catch (error) {
      console.error("Failed executing synchronization query:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTabUrl, debouncedSearch, filters, getAuthHeader]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (activeTabUrl === "my_escalations" || activeTabUrl === "all_escalations") {
      setViewMode(activeTabUrl);
      setPage(1); 
    }
  }, [activeTabUrl]);

  useEffect(() => {
    if (!isMounted) return; 
    fetchEscalationData();
  }, [isMounted, fetchEscalationData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); 
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleOpenFilters = () => {
    setTempFilters({ ...filters });
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters });
    setIsFilterModalOpen(false);
    setPage(1);
  };

  const handleResetFilters = () => {
    const cleared: FilterState = {
      assigned_officer: "",
      collection_conditions: "",
      auto_escalated: "",
      to_repossess: "",
      min_days_overdue: "",
      max_days_overdue: "",
      min_balance: "",
      max_balance: "",
      repossession_status: "",
      trigger_type: "",
      start_date: "",
      end_date: ""
    };
    setTempFilters(cleared);
    setFilters(cleared);
    setIsFilterModalOpen(false);
    setPage(1);
  };

  const handleExportCSV = () => {
    if (displayData.length === 0) return alert("No current page data to export");
    
    const headers = [
      "LOAN ID", "Customer Name", "Phone Number", "Registration Number",
      "Cumulative Balance", "Days Overdue", "To Repossess",
      "Repossession Status", "Collection Condition",
      ...(viewMode === "all_escalations" ? ["Assigned Officer"] : []),
      "Escalation Date", "Trigger Type"
    ];

    const rows = displayData.map(loan => [
      `"${loan.loan_id}"`,
      `"${loan.customer_name.replace(/"/g, '""')}"`, 
      `"${loan.phone_number}"`,
      `"${loan.registration_number}"`,
      loan.cumulative_balance,
      loan.days_overdue,
      loan.to_repossess ? "TRUE" : "FALSE",
      `"${loan.repossession_status || '—'}"`,
      `"${CONDITION_LABELS[loan.collection_condition] || loan.collection_condition || '—'}"`,
      ...(viewMode === "all_escalations" ? [`"${loan.assigned_officer || "Unassigned"}"`] : []),
      `"${new Date(loan.escalation_date).toLocaleDateString("en-GB")}"`,
      loan.is_auto_escalated ? "System" : "Manual"
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${viewMode === 'my_escalations' ? 'My' : 'All'}_Escalations_Page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (displayData.length === 0) return alert("No current page data to export");
    
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head></head><body><table border="1">`;
    
    html += `<tr style="background:#f1f5f9; font-weight:bold;">
      <td>LOAN ID</td><td>Customer Name</td><td>Phone Number</td><td>Registration Number</td>
      <td>Cumulative Balance</td><td>Days Overdue</td><td>To Repossess</td><td>Repossession Status</td>
      <td>Collection Condition</td>${viewMode === 'all_escalations' ? '<td>Assigned Officer</td>' : ''}<td>Escalation Date</td><td>Trigger Type</td>
    </tr>`;
    
    displayData.forEach((loan) => {
      html += `<tr>
        <td>${loan.loan_id}</td>
        <td>${loan.customer_name}</td>
        <td>+${loan.phone_number}</td>
        <td>${loan.registration_number}</td>
        <td>${loan.cumulative_balance}</td>
        <td>${loan.days_overdue}</td>
        <td>${loan.to_repossess ? "TRUE" : "FALSE"}</td>
        <td>${loan.repossession_status || '—'}</td>
        <td>${CONDITION_LABELS[loan.collection_condition] || loan.collection_condition || "—"}</td>
        ${viewMode === 'all_escalations' ? `<td>${loan.assigned_officer || "Unassigned"}</td>` : ''}
        <td>${new Date(loan.escalation_date).toLocaleDateString("en-GB")}</td>
        <td>${loan.is_auto_escalated ? "System" : "Manual"}</td>
      </tr>`;
    });
    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${viewMode === 'my_escalations' ? 'My' : 'All'}_Escalations_Page_${page}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Upper Navigation Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {viewMode === "my_escalations" ? "My Escalations" : "All Escalations"}
            </h1>
            <p className="text-sm text-slate-500">
              {viewMode === "my_escalations" 
                ? "Manage and track escalations assigned to you" 
                : "View and manage all escalations in the system"}
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Balance</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                KSh {summary.total_cumulative_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Escalated Accounts</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">
                {totalCount.toLocaleString()} Accounts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-[810px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, loan ID, registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
          <button onClick={handleOpenFilters} className="flex items-center space-x-2 w-full sm:w-auto justify-center px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-all">
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
            <span>Filters</span>
            {(Object.values(filters).some(Boolean)) && (
              <span className="w-2 h-2 rounded-full bg-blue-600 ml-1" />
            )}
          </button>
          
          <button onClick={handleExportCSV} className="px-4 py-2 bg-[#1d6fa5] hover:bg-[#16557f] text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2 bg-[#107c41] hover:bg-[#0c5e31] text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[450px] flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-4"> LOAN ID </th>
                <th className="p-4"> Customer Name </th>
                <th className="p-4"> Phone Number </th>
                <th className="p-4"> Registration Number </th>
                <th className="p-4"> Cumulative Balance </th>                                 
                <th className="p-4">Days Overdue</th>
                <th className="p-4">To Repossess</th>
                <th className="p-4">Repossession Status</th>
                <th className="p-4">Collection Condition</th>
                {viewMode === "all_escalations" && <th className="p-4">Assigned Officer</th>}
                <th className="p-4">Escalation Date</th>
                <th className="p-4">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={viewMode === "all_escalations" ? 12 : 11} className="p-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="font-semibold text-slate-600">Querying central ledger data records...</span>
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === "all_escalations" ? 12 : 11} className="p-16 text-center text-slate-400 font-semibold">
                    No system records found for this tab.
                  </td>
                </tr>
              ) : (
                displayData.map((loan) => (
                  <tr key={loan.loan_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-800">{loan.loan_id}</td>
                    <td className="p-4 font-extrabold text-slate-900 tracking-tight">{loan.customer_name}</td>
                    <td className="p-4 font-mono text-slate-600">
                      <span>{loan.phone_number}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-600 uppercase">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{loan.registration_number}</span>
                    </td>
                    <td className="p-4 font-extrabold text-slate-900">
                      KSh {loan.cumulative_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full font-black text-xs bg-red-50 text-red-700 border border-red-100">
                        {loan.days_overdue} days
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        loan.to_repossess ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        {loan.to_repossess ? "TRUE" : "FALSE"}
                      </span>
                    </td>

                    <td className="p-4 font-bold capitalize">
                      {loan.repossession_status ? (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide uppercase border ${
                          (() => {
                            switch (loan.repossession_status.toLowerCase()) {
                              case 'marked':
                                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
                              case 'in_progress':
                                return 'bg-blue-50 text-blue-700 border-blue-200';
                              case 'repossessed':
                                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              case 'court_ordered':
                                return 'bg-red-50 text-red-700 border-red-200';
                              default:
                                return 'bg-slate-50 text-slate-700 border-slate-200';
                            }
                          })()
                        }`}>
                          {loan.repossession_status.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium italic">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase whitespace-nowrap">
                        {CONDITION_LABELS[loan.collection_condition] || loan.collection_condition || "—"}
                      </span>
                    </td>
                    {viewMode === "all_escalations" && (
                      <td className="p-4 font-semibold text-slate-700">
                        {loan.assigned_officer || <span className="text-slate-400 font-medium italic">Unassigned</span>}
                      </td>
                    )}
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {new Date(loan.escalation_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        loan.is_auto_escalated ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {loan.is_auto_escalated ? "System" : "Manual"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs text-slate-500 font-semibold">
          <div className="flex items-center space-x-4">
            <div>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} total records
            </div>
            
            {/* Rows Per Page Dropdown */}
            <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-4">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1); 
                }}
                className="px-2 py-1 border border-slate-200 rounded bg-white font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <span className="text-slate-700 font-black">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <h3 className="font-bold text-slate-900 text-lg">Filters</h3>
              </div>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Assigned Officer Filter */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Assigned Officer
                </label>
                <input
                  type="text"
                  value={tempFilters.assigned_officer}
                  onChange={(e) => setTempFilters({ ...tempFilters, assigned_officer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                />
              </div>

              {/* 2. Escalation Date Range Pickers */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Escalation Date Range</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={tempFilters.start_date}
                    onChange={(e) => setTempFilters({ ...tempFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                  />
                  <input
                    type="date"
                    value={tempFilters.end_date}
                    onChange={(e) => setTempFilters({ ...tempFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                  />
                </div>
              </div>
              
              {/* 3. Collection Conditions */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collection Conditions</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CONDITION_LABELS).map(([val, lbl]) => {
                    const isSelected = tempFilters.collection_conditions === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTempFilters({ ...tempFilters, collection_conditions: isSelected ? "" : val })}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Days Overdue Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min Days Overdue</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={tempFilters.min_days_overdue}
                    onChange={(e) => setTempFilters({ ...tempFilters, min_days_overdue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Days Overdue</label>
                  <input
                    type="number"
                    placeholder="365"
                    value={tempFilters.max_days_overdue}
                    onChange={(e) => setTempFilters({ ...tempFilters, max_days_overdue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  />
                </div>
              </div>

              {/* 5. Trigger Type Toggle */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trigger</label>
                <div className="flex space-x-2">
                  {[
                    { label: "All", value: "" },
                    { label: "System", value: "true" },
                    { label: "Manual", value: "false" }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setTempFilters({ ...tempFilters, trigger_type: opt.value })}
                      className={`py-1 px-3 border rounded-xl text-xs font-bold transition-all ${
                        tempFilters.trigger_type === opt.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Repossession Status Filter */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repossession Status</label>
                <select
                  value={tempFilters.repossession_status}
                  onChange={(e) => setTempFilters({ ...tempFilters, repossession_status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none text-slate-700 font-medium"
                >
                  <option value="">All Status</option>
                  <option value="marked">Marked for Repossession</option>
                  <option value="in_progress">In Progress</option>
                  <option value="repossessed">Repossessed</option>
                  <option value="court_ordered">Court Ordered</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100 justify-end">
              <button onClick={handleResetFilters} className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-xl text-sm bg-slate-100 hover:bg-slate-200 transition-all">
                Reset
              </button>
              <button onClick={handleApplyFilters} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 shadow-sm transition-all">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}