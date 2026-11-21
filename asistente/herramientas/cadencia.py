#!/usr/bin/env python3
"""Cadencia de recompra por cliente/vendedor desde Odoo (solo lectura, pedidos confirmados).
Uso: python3 cadencia.py [--por-defecto 30] [--salida ruta.csv]
La clave API la inyecta el proxy del entorno; no se guarda aquí."""
import json, sys, argparse, urllib.request, statistics
from datetime import datetime, date
from collections import defaultdict

BASE = "https://lancaster-pharma.odoo.com/json/2/"
HDR = {"Content-Type": "application/json", "X-Odoo-Database": "lancaster-pharma", "Authorization": "Bearer dummy"}

def rpc(model, method, body):
    req = urllib.request.Request(BASE + f"{model}/{method}", json.dumps(body).encode(), HDR)
    return json.load(urllib.request.urlopen(req, timeout=60))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--por-defecto", type=int, default=30)
    ap.add_argument("--salida")
    a = ap.parse_args()
    hoy = date.today()
    orders = rpc("sale.order", "search_read", {"domain": [["state", "in", ["sale", "done"]]],
        "fields": ["partner_id", "user_id", "date_order", "amount_total", "order_line"], "limit": 5000})
    # cantidad total por pedido
    lines = rpc("sale.order.line", "search_read", {"domain": [["order_id", "in", [o["id"] for o in orders]], ["display_type", "=", False]],
        "fields": ["order_id", "product_uom_qty"], "limit": 50000})
    qty = defaultdict(float)
    for l in lines: qty[l["order_id"][0]] += l["product_uom_qty"]
    cli = defaultdict(list)
    for o in orders:
        cli[(o["partner_id"][1], o["user_id"][1] if o["user_id"] else "Sin vendedor")].append(
            (datetime.strptime(o["date_order"][:10], "%Y-%m-%d").date(), qty[o["id"]], o["amount_total"]))
    rows = []
    for (c, v), ps in cli.items():
        ps.sort()
        fechas = [p[0] for p in ps]
        n = len(ps)
        if n >= 3:
            cad = statistics.median((fechas[i+1]-fechas[i]).days for i in range(n-1)); fuente = "historial"
        else:
            cad = a.por_defecto; fuente = "por defecto"
        cad = max(cad, 1)
        dias = (hoy - fechas[-1]).days
        prox = fechas[-1].toordinal() + cad
        ratio = dias / cad
        est = "VERDE" if ratio < 0.8 else "AMARILLO" if ratio <= 1.3 else "ROJO" if ratio <= 2 else "EN RIESGO"
        rows.append(dict(vendedor=v, cliente=c, pedidos=n, ultima=fechas[-1].isoformat(), dias_sin_comprar=dias,
            cadencia_dias=int(cad), fuente=fuente, proxima=date.fromordinal(prox).isoformat(),
            cant_ultima=ps[-1][1], cant_promedio=round(sum(p[1] for p in ps)/n, 1), estado=est))
    orden = {"EN RIESGO": 0, "ROJO": 1, "AMARILLO": 2, "VERDE": 3}
    rows.sort(key=lambda r: (r["vendedor"], orden[r["estado"]], r["proxima"]))
    cols = list(rows[0].keys()) if rows else []
    out = open(a.salida, "w") if a.salida else sys.stdout
    import csv; w = csv.DictWriter(out, cols); w.writeheader(); w.writerows(rows)

if __name__ == "__main__": main()
