/**
 * baitong-vision — Web settings card (client half).
 *
 * registers a "百通视觉" section inside the DSH Web settings page:
 *   - 网关地址（opencode_v4_app，默认 http://localhost:8102）
 *   - 视觉孪生模型多选（勾选模型生成「(百通视觉)」变体，需重启生效）
 *   - 高级：上传/查询超时、调试日志
 *
 * 移植自 picturereader/client.js（手写 ModuleLoader bundle，无构建步骤）。
 */
window.__ModuleLoader__.load({
  id: "baitong-vision",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    var h = react.createElement;

    // ── CSS (theme tokens) ────────────────────────────────────────────────
    var CSS =
      ".__bv_root{max-width:640px;display:flex;flex-direction:column;gap:10px}" +
      ".__bv_field{display:flex;flex-direction:column;gap:4px}" +
      ".__bv_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:6px}" +
      ".__bv_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}" +
      ".__bv_row{display:flex;align-items:center;gap:8px}" +
      ".__bv_check{accent-color:var(--dsw-alias-state-business-primary)}" +
      ".__bv_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:13px;box-sizing:border-box;width:100%}" +
      ".__bv_inputSmall{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 6px;font-size:11px;width:100px;box-sizing:border-box}" +
      ".__bv_actions{display:flex;gap:8px;align-items:center;margin-top:4px}" +
      ".__bv_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}" +
      ".__bv_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}" +
      ".__bv_btn:disabled{opacity:.5;cursor:default}" +
      ".__bv_btnPrimary{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-on-accent)}" +
      ".__bv_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}" +
      ".__bv_error{font-size:12px;color:var(--dsw-alias-state-error-primary)}" +
      ".__bv_advanced{margin-top:8px;border-top:1px solid var(--dsw-alias-border-l2);padding-top:6px}" +
      ".__bv_advancedSummary{cursor:pointer;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary);user-select:none;display:flex;align-items:center;gap:5px}" +
      ".__bv_advancedArrow{display:inline-block;transition:transform .18s ease;font-size:13px;line-height:1;color:var(--dsw-alias-label-secondary);transform:rotate(0)}" +
      ".__bv_advanced[open] .__bv_advancedArrow{transform:rotate(90deg)}" +
      ".__bv_unavailable{font-size:13px;color:var(--dsw-alias-label-tertiary)}" +
      ".__bv_modelList{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px;background:var(--dsw-alias-bg-layer-2)}" +
      ".__bv_modelRow{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px}" +
      ".__bv_modelName{flex:1;color:var(--dsw-alias-label-primary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".__bv_modelProvider{font-size:10px;color:var(--dsw-alias-label-tertiary);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".__bv_empty{font-size:12px;color:var(--dsw-alias-label-tertiary);font-style:italic;padding:8px 0}" +
      ".__bv_gatewayStatus{font-size:11px;border-radius:6px;padding:4px 8px;display:inline-block}" +
      ".__bv_gatewayOk{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary-alpha)}" +
      ".__bv_gatewayDown{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-state-error-primary-alpha)}";
    var tagId = "baitong-vision/main.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + tagId + "\"]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "baitong-vision";
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ── locale ────────────────────────────────────────────────────────────
    var NS = "baitongvision";
    var inject = ["slots", "locale", "settingsScope"];
    var zh = {
      nav: "百通视觉",
      intro: "baitong-vision：把百通视觉能力（Qwen3.6）接到纯文本模型。填网关地址；在下方勾选需要视觉孪生的模型。网关地址与超时即时生效，视觉孪生需重启 DSH。",
      gatewayBase: "视觉网关地址",
      gatewayBaseHint: "opencode_v4_app（百通API 应用）的地址，默认 http://localhost:8102。需先确认该应用已启动。",
      gatewayProbe: "检查",
      gatewayOnline: "网关在线",
      gatewayOffline: "网关不可达（请启动百通API 应用）",
      probing: "检测中…",
      visionModels: "视觉孪生：为以下模型注入视觉能力",
      visionModelsHint: "勾选的文本模型会在模型选择器里多一个（百通视觉）变体，选它即可粘贴图片显示缩略图并自动上传网关。（需重启 DSH 生效）",
      visionNote: "备注",
      visionNotePH: "百通视觉（可改）",
      advanced: "高级设置",
      uploadTimeoutMs: "图片上传网关超时（毫秒）",
      queryTimeoutMs: "look_at_image 查询超时（毫秒）",
      debug: "调试日志（输出诊断信息）",
      save: "保存",
      reset: "恢复默认",
      saved: "已保存",
      saving: "保存中…",
      error: "保存失败",
      unavailable: "设置命名空间不可用（服务端未注册 baitongvision 命名空间？）",
      loading: "加载中…",
      noModels: "暂无可用模型（重启 DSH 后自动扫描）",
    };
    var en = {
      nav: "Baitong Vision",
      intro: "baitong-vision: connect Baitong vision (Qwen3.6) to text-only models. Set the gateway address; check models to give them a vision twin. Gateway & timeouts hot-apply; vision twin requires DSH restart.",
      gatewayBase: "Vision gateway URL",
      gatewayBaseHint: "opencode_v4_app (Baitong API app) address, default http://localhost:8102. Make sure it is running.",
      gatewayProbe: "Check",
      gatewayOnline: "Gateway online",
      gatewayOffline: "Gateway unreachable (start the Baitong API app)",
      probing: "Checking…",
      visionModels: "Vision twin: inject vision into these models",
      visionModelsHint: "Checked text models get a (Baitong Vision) variant in the model selector. Pick it to paste images with thumbnails & auto-upload. (Requires DSH restart)",
      visionNote: "Note",
      visionNotePH: "Baitong Vision (editable)",
      advanced: "Advanced",
      uploadTimeoutMs: "Image upload timeout (ms)",
      queryTimeoutMs: "look_at_image query timeout (ms)",
      debug: "Debug logging",
      save: "Save",
      reset: "Reset",
      saved: "Saved",
      saving: "Saving…",
      error: "Save failed",
      unavailable: "Settings namespace unavailable (baitongvision not registered server-side?)",
      loading: "Loading…",
      noModels: "No models available yet (will appear after DSH restart / model scan)",
    };

    // ── field spec ────────────────────────────────────────────────────────
    var FIELDS = [
      { key: "gateway_base", type: "text", labelKey: "gatewayBase", hintKey: "gatewayBaseHint" },
      { key: "vision_models", type: "models" },
      { key: "upload_timeout_ms", type: "number", advanced: true, labelKey: "uploadTimeoutMs" },
      { key: "query_timeout_ms", type: "number", advanced: true, labelKey: "queryTimeoutMs" },
      { key: "debug", type: "checkbox", advanced: true, labelKey: "debug" },
    ];
    var FIELD_LABELS = {
      gateway_base: "gatewayBase", upload_timeout_ms: "uploadTimeoutMs",
      query_timeout_ms: "queryTimeoutMs", debug: "debug",
    };

    // ── Vision Twin Model Picker ──────────────────────────────────────────
    function VisionTwinPicker(props) {
      var t = props.t;
      var scope = props.scope;
      var [available, setAvailable] = react.useState([]);
      var [selected, setSelected] = react.useState([]);

      react.useEffect(function () {
        var alive = true;
        function fetchModels() {
          fetch('/baitong-vision/models')
            .then(function (res) { return res.ok ? res.json() : []; })
            .then(function (data) { if (alive && Array.isArray(data)) setAvailable(data); })
            .catch(function () {});
        }
        function loadSelection() {
          if (!alive) return;
          var snap = scope.getSnapshot();
          if (snap.status !== "ready" || !snap.value) return;
          var sel = snap.value.vision_models;
          if (Array.isArray(sel)) setSelected(sel);
        }
        fetchModels();
        loadSelection();
        var timer = setInterval(function () { fetchModels(); loadSelection(); }, 5000);
        return function () { alive = false; clearInterval(timer); };
      }, [scope]);

      function toggleModel(model) {
        var idx = selected.findIndex(function (m) { return m.id === model.id && m.provider === model.provider; });
        var next;
        if (idx >= 0) {
          next = selected.slice(0, idx).concat(selected.slice(idx + 1));
        } else {
          next = selected.concat([{ id: model.id, provider: model.provider, note: "" }]);
        }
        setSelected(next);
        scope.set("vision_models", next).catch(function () {});
      }
      function setNote(model, note) {
        var next = selected.map(function (m) {
          if (m.id === model.id && m.provider === model.provider) return Object.assign({}, m, { note: note });
          return m;
        });
        setSelected(next);
        scope.set("vision_models", next).catch(function () {});
      }

      var isSelected = function (m) {
        return selected.some(function (s) { return s.id === m.id && s.provider === m.provider; });
      };
      var noteOf = function (m) {
        var entry = selected.find(function (s) { return s.id === m.id && s.provider === m.provider; });
        return entry ? (entry.note || "") : "";
      };

      return h("div", { className: "__bv_field" },
        h("span", { className: "__bv_label" }, t("visionModels")),
        h("span", { className: "__bv_hint" }, t("visionModelsHint")),
        available.length === 0
          ? h("p", { className: "__bv_empty" }, t("noModels"))
          : h("div", { className: "__bv_modelList" },
              available.map(function (m) {
                var key = m.provider + "/" + m.id;
                var checked = isSelected(m);
                return h("div", { key: key, className: "__bv_modelRow" },
                  h("input", {
                    className: "__bv_check",
                    type: "checkbox",
                    checked: checked,
                    onChange: function () { toggleModel(m); },
                  }),
                  h("span", { className: "__bv_modelName" }, m.name || m.id),
                  h("span", { className: "__bv_modelProvider" }, m.provider),
                  checked ? h("input", {
                    className: "__bv_inputSmall",
                    type: "text",
                    value: noteOf(m),
                    placeholder: t("visionNotePH"),
                    onChange: function (e) { setNote(m, e.target.value); },
                  }) : null
                );
              })
            )
      );
    }

    // ── Gateway 状态探针 ─────────────────────────────────────────────────
    function GatewayStatus(props) {
      var t = props.t;
      var scope = props.scope;
      var [state, setState] = react.useState("idle"); // idle | probing | ok | down

      function probe() {
        setState("probing");
        var snap = scope.getSnapshot();
        if (snap.status !== "ready" || !snap.value) { setState("idle"); return; }
        var base = String(snap.value.gateway_base || "").trim() || "http://localhost:8102";
        var url = base.replace(/\/+$/, "") + "/health";
        fetch(url, { signal: AbortSignal.timeout(5000) })
          .then(function (res) { setState(res.ok ? "ok" : "down"); })
          .catch(function () { setState("down"); });
      }

      react.useEffect(function () { probe(); }, []);

      if (state === "idle") return null;
      var label = state === "probing" ? t("probing")
        : state === "ok" ? t("gatewayOnline") : t("gatewayOffline");
      var badgeCls = "__bv_gatewayStatus " + (state === "ok" ? "__bv_gatewayOk" : "__bv_gatewayDown");
      return h("span", { className: badgeCls },
        label,
        state === "ok" || state === "down" ? h("button", {
          type: "button", className: "__bv_btn", style: { marginLeft: "8px", padding: "2px 8px" },
          onClick: probe,
        }, t("gatewayProbe")) : null
      );
    }

    // ── Section component ─────────────────────────────────────────────────
    function Section(props) {
      var t = props.t;
      var scope = props.scope;
      var [snapshot, setSnapshot] = react.useState(function () { return scope.getSnapshot(); });
      var ready = snapshot.status === "ready" && snapshot.value !== void 0;
      var [draft, setDraft] = react.useState({});
      var [busy, setBusy] = react.useState(false);
      var [notice, setNotice] = react.useState(null);
      var [error, setError] = react.useState(null);

      react.useEffect(function () {
        var alive = true;
        var sync = function () { if (alive) setSnapshot(scope.getSnapshot()); };
        var un = typeof scope.subscribe === "function" ? scope.subscribe(sync) : null;
        return function () { alive = false; if (un) un(); if (scope.dispose) scope.dispose(); };
      }, [scope]);
      react.useEffect(function () {
        if (ready) setDraft(function (prev) {
          var base = valueToDraft(snapshot.value);
          var merged = Object.assign({}, base);
          for (var k in prev) merged[k] = prev[k];
          return merged;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [ready]);

      if (snapshot.status === "unavailable") {
        return h("p", { className: "__bv_unavailable" }, t("unavailable"));
      }
      if (!ready) return h("p", { className: "__bv_status" }, t("loading"));

      var value = snapshot.value;

      function fieldDraft(f) {
        if (f.type === "checkbox") return draft[f.key] !== void 0 ? !!draft[f.key] : Boolean(value[f.key]);
        return draft[f.key] !== void 0 ? draft[f.key] : String(value[f.key] ?? "");
      }
      function setField(f, v) {
        setDraft(function (prev) { var n = Object.assign({}, prev); n[f.key] = v; return n; });
        setNotice(null); setError(null);
      }
      function fieldValue(f) {
        return draft[f.key] !== void 0 ? draft[f.key] : String(value[f.key] ?? "");
      }
      function onSave() {
        setBusy(true); setNotice(null); setError(null);
        var ops = [];
        FIELDS.forEach(function (f) {
          if (f.type === "models") return;
          if (f.type === "checkbox") {
            ops.push({ op: "set", key: f.key, value: draft[f.key] !== void 0 ? !!draft[f.key] : Boolean(value[f.key]) });
            return;
          }
          var dv = fieldValue(f);
          if (f.type === "number") {
            var num = Number(dv);
            if (Number.isFinite(num)) ops.push({ op: "set", key: f.key, value: num });
            return;
          }
          var str = String(dv);
          if (str.trim() === "") { ops.push({ op: "unset", key: f.key }); return; }
          ops.push({ op: "set", key: f.key, value: str });
        });
        var writes = ops.map(function (o) {
          return o.op === "set" ? scope.set(o.key, o.value) : scope.unset(o.key);
        });
        Promise.all(writes).then(function () {
          setBusy(false); setNotice(t("saved"));
        }).catch(function (e) {
          setBusy(false); setError(t("error") + ": " + String(e && e.message || e));
        });
      }
      function onReset() {
        setBusy(true);
        Promise.all(FIELDS.filter(function (f) { return f.type !== "models"; }).map(function (f) { return scope.unset(f.key); })).then(function () {
          setBusy(false); setNotice(t("saved"));
          setTimeout(function () {
            var fresh = scope.getSnapshot();
            if (fresh.status === "ready" && fresh.value !== void 0) setDraft(Object.assign({}, valueToDraft(fresh.value)));
          }, 120);
        }).catch(function (e) { setBusy(false); setError(t("error") + ": " + String(e && e.message || e)); });
      }

      function renderField(f) {
        if (f.type === "models") {
          return h(VisionTwinPicker, { key: f.key, t: t, scope: scope });
        }
        if (f.type === "checkbox") {
          var checked = !!fieldDraft(f);
          return h("label", { key: f.key, className: "__bv_field" },
            h("span", { className: "__bv_row" },
              h("input", { className: "__bv_check", type: "checkbox", checked: checked, onChange: function (e) { setField(f, e.target.checked); } }),
              h("span", { className: "__bv_label" }, t(FIELD_LABELS[f.key]))
            ),
            f.hintKey ? h("span", { className: "__bv_hint" }, t(f.hintKey)) : null
          );
        }
        return h("label", { key: f.key, className: "__bv_field" },
          h("span", { className: "__bv_label" }, t(FIELD_LABELS[f.key])),
          f.key === "gateway_base" ? h(GatewayStatus, { t: t, scope: scope }) : null,
          h("input", {
            className: "__bv_input",
            type: f.type === "number" ? "number" : "text",
            value: fieldDraft(f),
            placeholder: f.key === "gateway_base" ? "http://localhost:8102" : "",
            onChange: function (e) { setField(f, e.target.value); },
          }),
          f.hintKey ? h("span", { className: "__bv_hint" }, t(f.hintKey)) : null
        );
      }

      var primary = FIELDS.filter(function (f) { return !f.advanced; });
      var advanced = FIELDS.filter(function (f) { return f.advanced; });
      return h("div", { className: "__bv_root" },
        h("p", { className: "__bv_hint", style: { margin: "0 0 4px" } }, t("intro")),
        primary.map(renderField),
        advanced.length ? h("details", { className: "__bv_advanced" },
          h("summary", { className: "__bv_advancedSummary" },
            h("span", null, t("advanced")),
            h("span", { className: "__bv_advancedArrow" }, "▸")
          ),
          advanced.map(renderField)
        ) : null,
        h("div", { className: "__bv_actions" },
          h("button", { type: "button", className: "__bv_btn __bv_btnPrimary", onClick: onSave, disabled: busy || !snapshot.writable }, t("save")),
          h("button", { type: "button", className: "__bv_btn", onClick: onReset, disabled: busy || !snapshot.writable }, t("reset")),
          notice ? h("span", { className: "__bv_status" }, notice) : null,
          busy ? h("span", { className: "__bv_status" }, t("saving")) : null,
          error ? h("span", { className: "__bv_error" }, error) : null
        )
      );
    }

    function valueToDraft(value) {
      var out = {};
      for (var i = 0; i < FIELDS.length; i += 1) {
        var ft = FIELDS[i];
        if (ft.type === "models") continue;
        out[ft.key] = ft.type === "checkbox" ? Boolean(value[ft.key]) : String(value[ft.key] ?? "");
      }
      return out;
    }

    function apply(ctx) {
      var t = ctx.locale.bind(NS);
      ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }); }, "baitong-vision: dictionaries");
      var scope = ctx.settingsScope.bind({ namespace: NS });
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register({
          name: "settings.section",
          id: "baitong-vision",
          order: 31,
          label: function () { return t("nav"); },
          locale: NS,
        }, function (props) {
          return h(Section, Object.assign({}, props, { scope: scope }));
        });
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
