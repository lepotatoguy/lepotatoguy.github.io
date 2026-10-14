// Renders the Google Scholar Impact card from data/scholar_citations.json.
(function () {
  "use strict";

  var DATA_URL = "data/scholar_citations.json";
  var CHART_PAD_PX = 14;
  var LINE_COLOR = "#2c86c9";
  var DAY_MS = 86400000;

  function formatNumber(value) {
    var n = Number(value);
    return value === null || value === undefined || Number.isNaN(n) ? "--" : n.toLocaleString("en-US");
  }

  function formatDate(iso) {
    if (!iso) return "Pending";
    var d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function toTime(iso) {
    return new Date(iso + "T00:00:00Z").getTime();
  }

  // Cumulative citations over time: year-end totals derived from Scholar's
  // per-year counts (completed years only), followed by the daily snapshots.
  function buildSeries(yearly, history) {
    var daily = (history || [])
      .filter(function (e) { return e.date && Number.isFinite(Number(e.total_citations)); })
      .map(function (e) { return { t: toTime(e.date), v: Number(e.total_citations) }; })
      .sort(function (a, b) { return a.t - b.t; });
    var firstDaily = daily.length ? daily[0].t : Infinity;

    var running = 0;
    var yearEnds = [];
    (yearly || []).slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (r) {
      running += Number(r.citations) || 0;
      var t = toTime(r.year + "-12-31");
      if (t < firstDaily) yearEnds.push({ t: t, v: running });
    });
    return yearEnds.concat(daily);
  }

  function drawChart(canvas, series) {
    if (!canvas || !canvas.getContext) return;
    var ratio = window.devicePixelRatio || 1;
    var width = Math.floor(canvas.clientWidth * ratio);
    var height = Math.floor(canvas.clientHeight * ratio);
    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext("2d");
    var pad = CHART_PAD_PX * ratio;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(38, 90, 130, 0.14)";
    ctx.lineWidth = 1.4 * ratio;
    ctx.beginPath();
    ctx.moveTo(pad, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.stroke();
    if (!series.length) return;

    var pts = series.length === 1 ? [{ t: series[0].t - DAY_MS, v: series[0].v }, series[0]] : series;
    var tMin = pts[0].t;
    var tSpan = pts[pts.length - 1].t - tMin || 1;
    var vMin = Math.min.apply(null, pts.map(function (p) { return p.v; }));
    var vMax = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    var vSpan = vMax - vMin || 1;
    var xy = pts.map(function (p) {
      return {
        x: pad + ((p.t - tMin) / tSpan) * (width - pad * 2),
        y: height - pad - ((p.v - vMin) / vSpan) * (height - pad * 2),
      };
    });

    var fill = ctx.createLinearGradient(0, pad, 0, height - pad);
    fill.addColorStop(0, "rgba(62, 137, 193, 0.24)");
    fill.addColorStop(1, "rgba(62, 137, 193, 0.02)");
    ctx.beginPath();
    ctx.moveTo(xy[0].x, height - pad);
    xy.forEach(function (p) { ctx.lineTo(p.x, p.y); });
    ctx.lineTo(xy[xy.length - 1].x, height - pad);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    xy.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2.5 * ratio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    var last = xy[xy.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4.5 * ratio, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2 * ratio;
    ctx.stroke();
  }

  function render(card, data) {
    var summary = data.summary || {};
    var top = (data.top_papers || [])[0];
    var set = function (key, text) { card.querySelector("[data-scholar-" + key + "]").textContent = text; };

    set("total", formatNumber(summary.total_citations));
    set("hindex", formatNumber(summary.h_index));
    set("i10", formatNumber(summary.i10_index));
    set("papers", formatNumber(summary.paper_count));
    set("updated", formatDate(summary.updated));

    if (top && top.title) {
      var link = card.querySelector("[data-scholar-top-paper]");
      link.href = top.link || link.href;
      link.querySelector("strong").textContent = top.title;
    }

    var canvas = card.querySelector("[data-scholar-chart]");
    var series = buildSeries(data.yearly, data.history);
    drawChart(canvas, series);
    window.addEventListener("resize", function () { drawChart(canvas, series); });
  }

  function showFallback(card) {
    card.querySelector("[data-scholar-updated]").textContent = "Google Scholar";
    card.querySelector("[data-scholar-top-paper] strong").textContent = "Open the live Google Scholar profile";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var card = document.querySelector("[data-scholar-tracker]");
    if (!card || !window.fetch) return;
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) { render(card, data); })
      .catch(function (err) {
        console.warn("Scholar impact data unavailable:", err);
        showFallback(card);
      });
  });
})();
