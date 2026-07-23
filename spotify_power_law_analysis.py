"""
Spotify Artist Power-Law Analysis
==================================

Tests whether Spotify artist popularity (proxied by follower count) follows
a power-law / "winner-take-most" distribution, where a small percentage of
artists capture the vast majority of total audience.

WHY artist_followers AND NOT track_popularity OR streams:
  - This dataset does not include raw stream counts.
  - track_popularity / artist_popularity are bounded 0-100 scores that are
    recalculated relative to other artists/tracks and decay over time. They
    cannot show *magnitude* of dominance (a score of 100 could mean 10M
    monthly listeners or 200M -- you can't tell).
  - artist_followers is unbounded and cumulative, making it the best proxy
    available here for audience size / concentration, and the standard
    variable used in real-world power-law studies of platform audiences.

METHODS USED:
  1. Gini coefficient            -> single-number inequality measure (0=equal, 1=max unequal)
  2. Lorenz curve                -> visualizes cumulative share of followers held by artists
  3. Top-X% share                -> how much of the total pie the top N% of artists hold
  4. Log-log rank-size regression -> the classic power-law test (straight line on log-log = power law)
  5. Tail-cutoff sensitivity     -> tests whether the power law only holds in the "superstar" tail,
                                     which is common in real-world social/economic distributions

USAGE:
    python spotify_power_law_analysis.py --input track_data_final.csv --outdir results/

OUTPUT:
    - results/artists_deduped.csv         (clean artist-level dataset)
    - results/summary_statistics.txt      (all numeric findings)
    - results/chart1_lorenz_curve.png
    - results/chart2_loglog_rank_size.png
    - results/chart3_top_pct_share.png
    - results/chart4_fit_quality_by_cutoff.png
"""

import argparse
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats


# ----------------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------------

SPOTIFY_GREEN = "#1DB954"
SPOTIFY_RED = "#E91429"
TOP_PCT_BREAKPOINTS = [1, 5, 10, 20, 50]       # for the top-X% share chart/table
TAIL_CUTOFFS = [1.0, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02]  # fractions of artists, for sensitivity test

plt.rcParams["figure.dpi"] = 150
plt.rcParams["font.size"] = 11


# ----------------------------------------------------------------------------
# DATA LOADING
# ----------------------------------------------------------------------------

def load_artist_level_data(csv_path: str) -> pd.DataFrame:
    """
    Load track-level CSV and collapse to one row per unique artist.

    artist_followers / artist_popularity are artist-level attributes that
    repeat across every track row for that artist, so we drop duplicate
    artist_name rows and keep the first occurrence.
    """
    df = pd.read_csv(csv_path)

    required_cols = {"artist_name", "artist_followers"}
    missing = required_cols - set(df.columns)
    if missing:
        sys.exit(f"ERROR: input CSV is missing required columns: {missing}")

    df = df.dropna(subset=["artist_name", "artist_followers"])
    artist_cols = [c for c in ["artist_name", "artist_followers", "artist_popularity", "artist_genres"]
                   if c in df.columns]
    artists = (
        df[artist_cols]
        .drop_duplicates(subset="artist_name")
        .reset_index(drop=True)
    )
    artists["artist_followers"] = artists["artist_followers"].astype(float)
    artists = artists.sort_values("artist_followers", ascending=False).reset_index(drop=True)
    return artists


# ----------------------------------------------------------------------------
# STATISTICS
# ----------------------------------------------------------------------------

def gini_coefficient(values: np.ndarray) -> float:
    """Compute the Gini coefficient of inequality (0 = perfect equality, 1 = max inequality)."""
    arr = np.sort(values.astype(float))
    n = len(arr)
    cum = np.cumsum(arr)
    if cum[-1] == 0:
        return 0.0
    return (n + 1 - 2 * np.sum(cum) / cum[-1]) / n


def lorenz_curve_points(values: np.ndarray):
    """Return (cumulative_pop_pct, cumulative_value_pct) arrays for plotting a Lorenz curve."""
    arr = np.sort(values.astype(float))
    n = len(arr)
    cum_val = np.cumsum(arr)
    cum_val_pct = cum_val / cum_val[-1]
    cum_pop_pct = np.arange(1, n + 1) / n
    # prepend the (0,0) origin point
    return np.insert(cum_pop_pct, 0, 0), np.insert(cum_val_pct, 0, 0)


def top_pct_shares(values_desc: np.ndarray, pct_breakpoints):
    """For each pct in pct_breakpoints, return the share of total value held by the top pct% items."""
    n = len(values_desc)
    total = values_desc.sum()
    results = []
    for pct in pct_breakpoints:
        k = max(1, int(np.ceil(pct / 100 * n)))
        share = values_desc[:k].sum() / total * 100
        results.append((pct, k, share))
    return results


def rank_size_loglog_fit(values_desc: np.ndarray, top_fraction: float = 1.0):
    """
    Fit log(size) = intercept + slope * log(rank) via OLS on the top `top_fraction`
    of ranks (rank 1 = largest). Returns slope, intercept, r_squared, n_points used.
    A power law implies size ~ rank^slope, i.e. a straight line on a log-log plot.
    """
    n_total = len(values_desc)
    k = max(2, int(n_total * top_fraction))
    sizes = values_desc[:k]
    ranks = np.arange(1, k + 1)

    mask = sizes > 0
    log_rank = np.log(ranks[mask])
    log_size = np.log(sizes[mask])

    slope, intercept, r_value, p_value, std_err = stats.linregress(log_rank, log_size)
    return {
        "slope": slope,
        "intercept": intercept,
        "r_squared": r_value ** 2,
        "p_value": p_value,
        "n_points": mask.sum(),
    }


# ----------------------------------------------------------------------------
# CHARTS
# ----------------------------------------------------------------------------

def plot_lorenz_curve(values: np.ndarray, gini: float, outpath: str):
    x, y = lorenz_curve_points(values)
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.plot([0, 1], [0, 1], "--", color="gray", label="Perfect Equality")
    ax.plot(x, y, color=SPOTIFY_GREEN, linewidth=2.5, label="Lorenz Curve (Artist Followers)")
    ax.fill_between(x, x, y, alpha=0.15, color=SPOTIFY_GREEN)
    ax.set_xlabel("Cumulative Share of Artists (sorted ascending)")
    ax.set_ylabel("Cumulative Share of Total Followers")
    ax.set_title(f"Lorenz Curve: Spotify Artist Follower Concentration\nGini Coefficient = {gini:.3f}")
    ax.legend()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


def plot_loglog_rank_size(values_desc: np.ndarray, full_fit: dict, outpath: str):
    n = len(values_desc)
    mask = values_desc > 0
    ranks = np.arange(1, n + 1)[mask]
    sizes = values_desc[mask]

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(ranks, sizes, s=8, alpha=0.5, color=SPOTIFY_GREEN, label="Artists")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Rank (log scale)")
    ax.set_ylabel("Followers (log scale)")
    ax.set_title("Rank-Size Distribution of Artist Followers (Log-Log)")

    fit_y = np.exp(full_fit["intercept"] + full_fit["slope"] * np.log(ranks))
    ax.plot(ranks, fit_y, "--", color=SPOTIFY_RED, linewidth=1.5,
             label=f"Full-range fit (R\u00b2={full_fit['r_squared']:.3f})")
    ax.legend()
    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


def plot_top_pct_share(shares, outpath: str):
    labels = [f"Top {pct}%" for pct, _, _ in shares]
    values = [share for _, _, share in shares]

    fig, ax = plt.subplots(figsize=(8, 5.5))
    bars = ax.bar(labels, values, color=SPOTIFY_GREEN, edgecolor="black", linewidth=0.5)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + 1, f"{v:.1f}%", ha="center", fontweight="bold")
    ax.set_ylabel("% of Total Followers Held")
    ax.set_title("Follower Concentration Among Top Artists")
    ax.set_ylim(0, 105)
    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)


def plot_fit_quality_by_cutoff(values_desc: np.ndarray, tail_cutoffs, outpath: str):
    fits = []
    for frac in tail_cutoffs:
        fit = rank_size_loglog_fit(values_desc, top_fraction=frac)
        if fit["n_points"] < 10:
            continue
        fits.append((frac * 100, abs(fit["slope"]), fit["r_squared"]))

    xs = [f[0] for f in fits]
    slopes = [f[1] for f in fits]
    r2s = [f[2] for f in fits]

    fig, ax1 = plt.subplots(figsize=(8, 5.5))
    ax1.plot(xs, r2s, "o-", color=SPOTIFY_GREEN, linewidth=2, markersize=7, label="R\u00b2 (fit quality)")
    ax1.set_xlabel("Top X% of Artists Included in Fit")
    ax1.set_ylabel("R\u00b2 of Power-Law Fit", color=SPOTIFY_GREEN)
    ax1.tick_params(axis="y", labelcolor=SPOTIFY_GREEN)
    ax1.set_xscale("log")
    ax1.invert_xaxis()

    ax2 = ax1.twinx()
    ax2.plot(xs, slopes, "s--", color=SPOTIFY_RED, linewidth=2, markersize=6, label="|\u03b1| exponent")
    ax2.set_ylabel("Power-Law Exponent |\u03b1|", color=SPOTIFY_RED)
    ax2.tick_params(axis="y", labelcolor=SPOTIFY_RED)

    ax1.set_title("Power-Law Fit Quality vs. Tail Cutoff\n(Better fit when restricted to top artists)")
    fig.tight_layout()
    fig.savefig(outpath)
    plt.close(fig)

    return fits


# ----------------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Spotify artist power-law analysis")
    parser.add_argument("--input", default="track_data_final.csv", help="Path to track-level CSV")
    parser.add_argument("--outdir", default="results", help="Directory to write outputs to")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    print(f"Loading data from {args.input} ...")
    artists = load_artist_level_data(args.input)
    n = len(artists)
    print(f"Loaded {n} unique artists.\n")

    artists.to_csv(os.path.join(args.outdir, "artists_deduped.csv"), index=False)

    followers = artists["artist_followers"].values
    followers_desc = np.sort(followers)[::-1]

    # --- Gini coefficient ---
    g = gini_coefficient(followers)

    # --- Top-X% shares ---
    shares = top_pct_shares(followers_desc, TOP_PCT_BREAKPOINTS)
    bottom_50_share = followers_desc[::-1][: int(0.5 * n)].sum() / followers_desc.sum() * 100

    # --- Full-range log-log fit ---
    full_fit = rank_size_loglog_fit(followers_desc, top_fraction=1.0)

    # --- Tail-cutoff sensitivity ---
    print("Generating charts ...")
    cutoff_fits = plot_fit_quality_by_cutoff(
        followers_desc, TAIL_CUTOFFS, os.path.join(args.outdir, "chart4_fit_quality_by_cutoff.png")
    )

    # --- Plots ---
    plot_lorenz_curve(followers, g, os.path.join(args.outdir, "chart1_lorenz_curve.png"))
    plot_loglog_rank_size(followers_desc, full_fit, os.path.join(args.outdir, "chart2_loglog_rank_size.png"))
    plot_top_pct_share(shares, os.path.join(args.outdir, "chart3_top_pct_share.png"))

    # --- Write summary report ---
    lines = []
    lines.append("=" * 70)
    lines.append("SPOTIFY ARTIST POWER-LAW ANALYSIS - SUMMARY")
    lines.append("=" * 70)
    lines.append(f"\nUnique artists analyzed: {n}")
    lines.append(f"Total followers across all artists: {int(followers.sum()):,}")
    lines.append(f"\n--- GINI COEFFICIENT ---")
    lines.append(f"Gini = {g:.4f}  (0 = perfect equality, 1 = max inequality)")
    lines.append(f"For reference: most national income Gini coefficients fall between 0.30-0.60.")

    lines.append(f"\n--- TOP-X% SHARE OF TOTAL FOLLOWERS ---")
    for pct, k, share in shares:
        lines.append(f"Top {pct:>2}% of artists ({k:>4} artists) hold {share:>6.2f}% of total followers")
    lines.append(f"Bottom 50% of artists hold {bottom_50_share:.2f}% of total followers")

    lines.append(f"\n--- FULL-RANGE LOG-LOG POWER-LAW FIT (all {n} artists) ---")
    lines.append(f"slope (power-law exponent): {full_fit['slope']:.4f}")
    lines.append(f"R-squared: {full_fit['r_squared']:.4f}")
    lines.append(f"p-value: {full_fit['p_value']:.2e}")
    lines.append("NOTE: R-squared well below ~0.95 indicates the FULL distribution does")
    lines.append("NOT follow a clean single power law -- see tail-cutoff sensitivity below.")

    lines.append(f"\n--- TAIL-CUTOFF SENSITIVITY (does the fit improve in just the top tier?) ---")
    lines.append(f"{'Top X% of artists':<22}{'|alpha| exponent':<20}{'R-squared':<12}")
    for top_pct, slope, r2 in cutoff_fits:
        lines.append(f"{top_pct:<22.1f}{slope:<20.4f}{r2:<12.4f}")
    lines.append("\nInterpretation: if R-squared rises sharply as you restrict to a smaller top")
    lines.append("percentage, the power law holds in the 'superstar' tail but not across the")
    lines.append("full population -- the broader population is closer to log-normal. This is a")
    lines.append("well-documented pattern in real-world social/economic distributions.")

    summary_text = "\n".join(lines)
    summary_path = os.path.join(args.outdir, "summary_statistics.txt")
    with open(summary_path, "w") as f:
        f.write(summary_text)

    print(summary_text)
    print(f"\nAll outputs written to: {os.path.abspath(args.outdir)}/")


if __name__ == "__main__":
    main()
