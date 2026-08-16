import re
import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replacements_crm = [
    ('bg-emerald-50/70 border-emerald-100', 'bg-[#181818] border-white/5'),
    ('text-emerald-500', 'text-emerald-400'),
    ('bg-blue-50/70 border-blue-100', 'bg-[#181818] border-white/5'),
    ('text-blue-500', 'text-blue-400'),
    ('bg-purple-50/70 border-purple-100', 'bg-[#181818] border-white/5'),
    ('text-purple-500', 'text-purple-400'),
    ('bg-amber-50/70 border-amber-100', 'bg-[#181818] border-white/5'),
    ('text-amber-500', 'text-amber-400'),
    ('bg-pink-50/70 border-pink-100', 'bg-[#181818] border-white/5'),
    ('text-pink-500', 'text-pink-400'),
    ('iconBg: "bg-white"', 'iconBg: "bg-[#222]"'),
    
    # Header & Search
    ('bg-slate-900/5 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-slate-200/60', 'bg-[#181818] backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/5'),
    ('bg-slate-700 hover:bg-slate-600', 'bg-[#9333ea] hover:bg-purple-600'),
    ('text-yellow-400', 'text-white'),
    ('text-indigo-400 absolute', 'text-gray-400 absolute'),
    ('bg-white text-slate-800 placeholder:text-slate-400 focus:ring-indigo-400', 'bg-[#111] text-white placeholder:text-gray-500 focus:ring-[#9333ea]'),
    ('border border-slate-200 bg-white', 'border border-white/10 bg-[#111]'),
    ('hover:bg-slate-200 text-slate-700 bg-white shadow-sm border border-slate-200', 'hover:bg-[#222] text-gray-300 bg-[#181818] shadow-sm border border-white/5'),
    ('bg-white border border-slate-100 shadow-xl', 'bg-[#181818] border border-white/5 shadow-2xl'),
    
    # Dropdown items
    ('bg-indigo-50 text-indigo-700 font-bold', 'bg-[#222] text-white font-bold'),
    ('text-slate-600 hover:bg-slate-50', 'text-gray-400 hover:bg-[#222] hover:text-white'),
    ('bg-rose-50 text-rose-700', 'bg-rose-900/20 text-rose-400'),
    
    # Toolbar
    ('bg-slate-50/95 backdrop-blur-md p-2 rounded-b-2xl sm:rounded-2xl border border-slate-100 shadow-md', 'bg-[#181818]/95 backdrop-blur-md p-2 rounded-b-2xl sm:rounded-2xl border border-white/5 shadow-lg'),
    ('text-slate-500 hover:text-indigo-600', 'text-gray-400 hover:text-[#9333ea]'),
    ('text-indigo-600 shrink-0', 'text-[#9333ea] shrink-0'),
    
    # Selects
    ('bg-transparent border border-slate-200', 'bg-[#111] border border-white/10'),
    ('text-slate-600 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500', 'text-gray-300 font-semibold focus:ring-[#9333ea]/20 focus:border-[#9333ea]'),
    ('bg-slate-800 text-white border-none', 'bg-[#111] text-white border border-white/10'),
    ('bg-indigo-600 hover:bg-indigo-500 text-white', 'bg-[#9333ea] hover:bg-purple-600 text-white'),
    
    # Sort Button
    ('bg-white border border-slate-200 rounded-full', 'bg-[#111] border border-white/10 rounded-full'),
    ('text-indigo-400 hover:bg-indigo-50', 'text-gray-400 hover:bg-[#222] hover:text-white'),
    
    # Loading
    ('bg-white/50 backdrop-blur-[1px]', 'bg-[#0B101E]/50 backdrop-blur-[2px]'),
    ('text-indigo-600 animate-spin', 'text-[#9333ea] animate-spin'),
    
    # Card texts
    ('text-slate-800', 'text-white'),
    ('text-slate-500', 'text-gray-400'),
    ('text-slate-600 hover:text-indigo-600', 'text-gray-300 hover:text-[#9333ea]'),
    ('text-slate-600', 'text-gray-300'),
    ('bg-slate-100', 'bg-[#222]'),
    ('text-slate-400', 'text-gray-500'),
    ('text-slate-300', 'text-gray-600'),
    
    # Card Actions
    ('w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100', 'w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-white/5'),
    ('hover:bg-slate-50 transition-colors', 'hover:bg-[#222] transition-colors hover:text-white'),
    ('bg-white rounded-xl', 'bg-[#111] rounded-xl'),
    ('border-slate-100', 'border-white/5'),
    ('border-rose-50 text-rose-500 hover:bg-rose-50', 'border-rose-900/30 text-rose-400 hover:bg-rose-900/20'),
    ('border-blue-50 text-blue-500 hover:bg-blue-50', 'border-blue-900/30 text-blue-400 hover:bg-blue-900/20'),
    ('border-emerald-50 text-emerald-500 hover:bg-emerald-50', 'border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/20'),
    
    # Pagination
    ('hover:bg-slate-50 hover:text-indigo-600', 'hover:bg-[#222] hover:text-white'),
    ('bg-indigo-600 text-white border-indigo-600', 'bg-[#9333ea] text-white border-[#9333ea]'),
    ('bg-white hover:bg-slate-50 text-indigo-600 font-bold border border-indigo-200', 'bg-[#181818] hover:bg-[#222] text-[#9333ea] font-bold border border-white/5'),
]

crm_path = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\page.tsx'
replace_in_file(crm_path, replacements_crm)
print("CRM styles updated")
