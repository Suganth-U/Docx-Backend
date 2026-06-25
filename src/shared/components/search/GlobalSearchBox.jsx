import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  FileText,
  LoaderCircle,
  Search,
  ShoppingCart,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import useAxiosPrivate from "@/shared/hooks/useAxiosPrivate";

const typeLabels = {
  navigation: "Navigation",
  patient: "Patients",
  doctor: "Doctors",
  appointment: "Appointments",
  order: "Orders and payments",
  consultation: "Online consultations",
  record: "Clinical records",
  schedule: "Schedules",
};

const typeIcons = {
  navigation: Activity,
  patient: User,
  doctor: Stethoscope,
  appointment: CalendarDays,
  order: ShoppingCart,
  consultation: Users,
  record: FileText,
  schedule: CalendarDays,
};

const groupResults = (results = []) =>
  results.reduce((groups, item) => {
    const label = typeLabels[item.type] || "Results";
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }

    return groups;
  }, []);

const GlobalSearchBox = ({
  endpoint,
  placeholder,
  shortcutLabel = "⌘K",
  navigate,
  fallbackPath,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const groupedResults = useMemo(() => groupResults(results), [results]);
  const trimmedQuery = query.trim();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosPrivate.get(endpoint, {
          params: { query: trimmedQuery },
        });

        if (!active) return;
        setResults(Array.isArray(data?.results) ? data.results : []);
        setIsOpen(true);
      } catch (searchError) {
        if (!active) return;
        setResults([]);
        setError(searchError.response?.data?.message || "Search is unavailable right now.");
        setIsOpen(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [axiosPrivate, endpoint, trimmedQuery]);

  const openResult = (item) => {
    if (!item?.path) return;

    navigate(item.path);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key !== "Enter") return;

    const firstResult = results[0];

    if (firstResult) {
      openResult(firstResult);
      return;
    }

    if (trimmedQuery && fallbackPath) {
      navigate(`${fallbackPath}?search=${encodeURIComponent(trimmedQuery)}`);
      setQuery("");
      setIsOpen(false);
    }
  };

  return (
    <div className="nav-search-section global-search-wrapper" ref={wrapperRef}>
      <div className="search-pill">
        <Search size={18} className="search-icon-glass" />
        <input
          ref={inputRef}
          type="text"
          className="search-input-glass"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {loading ? (
          <LoaderCircle size={16} className="global-search-spinner" />
        ) : (
          <div className="shortcut-hint">{shortcutLabel}</div>
        )}
      </div>

      {isOpen && trimmedQuery.length > 0 ? (
        <div className="global-search-panel">
          {trimmedQuery.length < 2 ? (
            <div className="global-search-empty">Type at least 2 characters.</div>
          ) : error ? (
            <div className="global-search-empty">{error}</div>
          ) : !loading && groupedResults.length === 0 ? (
            <div className="global-search-empty">No matches for "{trimmedQuery}".</div>
          ) : (
            groupedResults.map((group) => (
              <div className="global-search-group" key={group.label}>
                <div className="global-search-label">{group.label}</div>
                {group.items.map((item, index) => {
                  const Icon = typeIcons[item.type] || Activity;

                  return (
                    <button
                      type="button"
                      className="global-search-result"
                      key={`${item.type}-${item.path}-${index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openResult(item)}
                    >
                      <span className={`global-search-result-icon type-${item.type}`}>
                        <Icon size={16} />
                      </span>
                      <span className="global-search-result-copy">
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </span>
                      {item.meta ? <em>{item.meta}</em> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GlobalSearchBox;
