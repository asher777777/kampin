{/* ================= STEP 1: AMOUNT ================= */}
        {step === "amount" && (
          <div className="space-y-4 animate-in slide-in-from-right fade-in">
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-1">
                {renderIcon(drawerConfig?.mainIcon, <Heart className="w-6 h-6 fill-current" />)}
              </div>
              <h3 className="text-2xl font-black">{drawerConfig?.mainTitle || "תרומה לקמפיין"}</h3>
              {ambassadorName && (
                <span className="inline-block bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
                  מיועד לשגריר: {ambassadorName}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-4 justify-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                {renderIcon(drawerConfig?.step1Icon, "1")}
              </div>
              <h4 className="text-xl font-bold">{drawerConfig?.step1Title || "שלב א: בחירת סכום"}</h4>
            </div>

            {configDonationType === "both" && (
              <div className="flex bg-slate-800 p-1 rounded-2xl mb-6 border border-slate-700" style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor }}>
                <button
                  type="button"
                  onClick={() => setDonationMode("recurring")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    donationMode === "recurring"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  <span>הוראת קבע חודשית</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDonationMode("one_time")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    donationMode === "one_time"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>תרומה חד פעמית</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-3 text-slate-300" style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                {donationMode === "recurring" ? "בחר מדרגת תרומה חודשית (הוראת קבע)" : "בחר סכום תרומה"}
              </label>

              <CampaignTiersList
                tiers={tiers}
                donationMode={donationMode === "recurring" ? "recurring" : "one_time"}
                selectedTierId={selectedTierId}
                onSelectTier={handleSelectTier}
                onSelectCustomTier={handleSelectCustomTier}
                theme="dark"
              />
            </div>

            <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80 space-y-4" style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor }}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400" style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                    {donationMode === "recurring" ? "ממגל ממש מקבלים:" : 'סה"כ לתשלום:'}
                  </span>
                  <div className="text-3xl font-black text-emerald-400 dir-rtl">
                    ₪{calculatedTotal.toLocaleString()}
                  </div>
                  {donationMode === "recurring" && (
                    <span className="text-xs text-slate-400 font-medium" style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                      במשך {months} חודשים (₪{currentMonthly}/חודש)
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-300" style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>תרומתך{donationMode === "recurring" ? " החודשית:" : ":"}</label>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-2xl font-black text-white dir-ltr" style={{ backgroundColor: drawerConfig?.fieldBgColor ? 'rgba(0,0,0,0.2)' : undefined, borderColor: drawerConfig?.borderColor }}>
                    <span className="text-xs text-slate-400 font-bold px-1 border-r border-slate-700 pr-2">₪ ILS</span>
                    <input
                      type="number"
                      min="1"
                      value={monthlyAmount}
                      onChange={handleCustomInputChange}
                      className="w-28 bg-transparent text-right focus:outline-none text-white font-black"
                    />
                  </div>
                </div>
              </div>

              {donationMode === "recurring" && (
                <div className="bg-emerald-950/60 border border-emerald-600/40 p-3 rounded-xl text-center text-xs text-emerald-200 font-bold" style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                  תרומה חודשית בהוראת קבע: ברצוני לתרום ₪{currentMonthly} במשך {months} חודשים (סה"כ: ₪{calculatedTotal.toLocaleString()}.00)
                </div>
              )}
            </div>
            
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-3 rounded-xl text-xs font-semibold text-center mb-4">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!currentMonthly || currentMonthly <= 0) {
                    setError("אנא בחר סכום תרומה תקין");
                    return;
                  }
                  setError("");
                  setStep("details");
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>המשך לפרטים אישיים</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        