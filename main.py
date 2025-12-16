#!/usr/bin/env python3
"""
Singularity.io - Desktop Application
Futuristic Solana Blockchain Platform
"""

import tkinter as tk
from tkinter import ttk
import threading
import time
import random
from datetime import datetime

class MatrixBackground:
    def __init__(self, canvas):
        self.canvas = canvas
        self.drops = []
        self.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?"
        self.running = True
        
    def start(self):
        self.canvas.configure(bg='#000000')
        threading.Thread(target=self.animate, daemon=True).start()
        
    def animate(self):
        while self.running:
            self.canvas.delete("matrix")
            width = self.canvas.winfo_width()
            height = self.canvas.winfo_height()
            
            if width > 1 and height > 1:
                cols = width // 20
                
                # Initialize drops
                if len(self.drops) != cols:
                    self.drops = [0] * cols
                
                for i in range(cols):
                    char = random.choice(self.chars)
                    x = i * 20
                    y = self.drops[i] * 20
                    
                    # Bright blue matrix effect
                    alpha = min(255, max(100, 255 - (y % 150)))
                    blue_intensity = min(255, max(150, alpha + 50))
                    color = f"#{0:02x}{50:02x}{blue_intensity:02x}"
                    
                    self.canvas.create_text(
                        x, y, text=char, fill=color, 
                        font=('Courier', 14, 'bold'), tags="matrix"
                    )
                    
                    if y > height and random.random() > 0.975:
                        self.drops[i] = 0
                    else:
                        self.drops[i] += 1
                        
            time.sleep(0.05)

class SingularityApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Singularity.io - Solana Platform")
        self.root.geometry("1200x800")
        self.root.configure(bg='#000000')
        
        # Configure style
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()
        
        self.wallet_connected = False
        self.wallet_address = None
        self.sol_balance = 0.0
        self.sio_balance = 0.0
        self.balance_labels = {}
        
        self.setup_ui()
        
    def configure_styles(self):
        # Configure futuristic blue/black theme
        self.style.configure('Title.TLabel', 
                           background='#000000', 
                           foreground='#00aaff',
                           font=('Orbitron', 28, 'bold'))
        
        self.style.configure('Subtitle.TLabel',
                           background='#000000',
                           foreground='#66ccff', 
                           font=('Orbitron', 14))
        
        self.style.configure('Matrix.TFrame',
                           background='#000000',
                           relief='flat')
        
        self.style.configure('Cyber.TButton',
                           background='#0088ff',
                           foreground='#ffffff',
                           font=('Orbitron', 12, 'bold'),
                           borderwidth=2,
                           relief='raised')
        
        self.style.map('Cyber.TButton',
                      background=[('active', '#0066cc')],
                      relief=[('pressed', 'sunken')])
        
    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root, style='Matrix.TFrame')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Matrix background canvas
        self.bg_canvas = tk.Canvas(main_frame, highlightthickness=0, bg='#000000')
        self.bg_canvas.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Ensure canvas updates properly
        self.root.after(100, self.update_canvas_size)
        
        self.matrix = MatrixBackground(self.bg_canvas)
        self.matrix.start()
        
        # Header
        header_frame = ttk.Frame(main_frame, style='Matrix.TFrame')
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        title_label = ttk.Label(header_frame, text="SINGULARITY.io", style='Title.TLabel')
        title_label.pack(side=tk.LEFT)
        
        subtitle_label = ttk.Label(header_frame, text="Solana Blockchain Platform", style='Subtitle.TLabel')
        subtitle_label.pack(side=tk.LEFT, padx=(20, 0))
        
        # Wallet button
        self.wallet_btn = ttk.Button(header_frame, text="Connect Wallet", 
                                   style='Cyber.TButton', command=self.connect_wallet)
        self.wallet_btn.pack(side=tk.RIGHT)
        
        # Balance display
        balance_frame = ttk.Frame(header_frame, style='Matrix.TFrame')
        balance_frame.pack(side=tk.RIGHT, padx=(0, 10))
        
        self.balance_labels['sol'] = ttk.Label(balance_frame, text="SOL: 0.00", style='Subtitle.TLabel')
        self.balance_labels['sol'].pack(side=tk.TOP)
        
        self.balance_labels['sio'] = ttk.Label(balance_frame, text="S-IO: 0", style='Subtitle.TLabel')
        self.balance_labels['sio'].pack(side=tk.TOP)
        
        # Status label
        self.status_label = ttk.Label(header_frame, text="Disconnected", style='Subtitle.TLabel')
        self.status_label.pack(side=tk.RIGHT, padx=(0, 10))
        
        # Main content area
        content_frame = ttk.Frame(main_frame, style='Matrix.TFrame')
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Left panel - Navigation
        nav_frame = ttk.Frame(content_frame, style='Matrix.TFrame')
        nav_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 20))
        
        nav_buttons = [
            ("ULTIMA Terminal", self.open_ultima),
            ("Token Launchpad", self.open_launchpad),
            ("Swap Interface", self.open_swap),
            ("Portfolio", self.open_portfolio),
            ("Analytics", self.open_analytics),
            ("Staking", self.open_staking)
        ]
        
        for text, command in nav_buttons:
            btn = ttk.Button(nav_frame, text=text, style='Cyber.TButton', 
                           command=command, width=15)
            btn.pack(pady=5, fill=tk.X)
        
        # Right panel - Main content
        self.content_area = ttk.Frame(content_frame, style='Matrix.TFrame')
        self.content_area.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # Default content
        self.show_dashboard()
        
        # Start balance updates
        self.update_balances()
        
    def update_canvas_size(self):
        """Update canvas size for matrix background"""
        self.bg_canvas.configure(width=self.root.winfo_width(), height=self.root.winfo_height())
        self.root.after(1000, self.update_canvas_size)
    
    def update_balances(self):
        """Update wallet balances in real-time"""
        if self.wallet_connected and self.wallet_address:
            threading.Thread(target=self.fetch_balances, daemon=True).start()
        self.root.after(5000, self.update_balances)  # Update every 5 seconds
    
    def fetch_balances(self):
        """Fetch balances from blockchain"""
        try:
            from wallet_bridge import wallet_bridge
            
            # Get SOL balance
            sol_result = wallet_bridge.get_balance(self.wallet_address)
            if sol_result.get('success'):
                self.sol_balance = sol_result.get('balance', 0.0)
            
            # Get S-IO balance
            sio_mint = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"
            sio_result = wallet_bridge.get_token_balance(self.wallet_address, sio_mint)
            if sio_result.get('success'):
                self.sio_balance = sio_result.get('balance', 0.0)
            
            # Update UI on main thread
            self.root.after(0, self.update_balance_display)
            
        except Exception as e:
            self.root.after(0, lambda: self.status_label.configure(text=f"Balance error: {str(e)}"))
    
    def update_balance_display(self):
        """Update balance labels on UI"""
        self.balance_labels['sol'].configure(text=f"SOL: {self.sol_balance:.3f}")
        self.balance_labels['sio'].configure(text=f"S-IO: {self.sio_balance:,.0f}")
        
    def connect_wallet(self):
        if not self.wallet_connected:
            # Connect wallet via bridge
            try:
                from wallet_bridge import wallet_bridge
                result = wallet_bridge.connect_phantom()
                if result.get('success'):
                    self.wallet_connected = True
                    self.wallet_address = result.get('public_key')
                    self.wallet_btn.configure(text="Disconnect")
                    self.status_label.configure(text=f"Connected: {self.wallet_address[:8]}...")
                    # Immediate balance fetch
                    threading.Thread(target=self.fetch_balances, daemon=True).start()
                else:
                    self.status_label.configure(text="Connection failed")
            except Exception as e:
                self.status_label.configure(text=f"Connection error: {str(e)}")
        else:
            self.wallet_connected = False
            self.wallet_address = None
            self.sol_balance = 0.0
            self.sio_balance = 0.0
            self.wallet_btn.configure(text="Connect Wallet")
            self.status_label.configure(text="Disconnected")
            self.update_balance_display()
    
    def clear_content(self):
        for widget in self.content_area.winfo_children():
            widget.destroy()
    
    def show_dashboard(self):
        self.clear_content()
        
        dashboard_label = ttk.Label(self.content_area, text="Dashboard", style='Title.TLabel')
        dashboard_label.pack(pady=20)
        
        # Stats grid
        stats_frame = ttk.Frame(self.content_area, style='Matrix.TFrame')
        stats_frame.pack(fill=tk.X, padx=20, pady=20)
        
        # Calculate total value
        sol_price = 150.0  # Approximate SOL price
        sio_price = 0.001  # S-IO price
        total_value = (self.sol_balance * sol_price) + (self.sio_balance * sio_price)
        
        stats = [
            ("SOL Balance", f"{self.sol_balance:.3f} SOL"),
            ("S-IO Balance", f"{self.sio_balance:,.0f} S-IO"),
            ("Total Value", f"${total_value:.2f}"),
            ("Network Status", "Online" if self.wallet_connected else "Offline")
        ]
        
        for i, (label, value) in enumerate(stats):
            frame = ttk.Frame(stats_frame, style='Matrix.TFrame')
            frame.grid(row=i//2, column=i%2, padx=10, pady=10, sticky='ew')
            
            ttk.Label(frame, text=label, style='Subtitle.TLabel').pack()
            ttk.Label(frame, text=value, foreground='#0066ff', 
                     background='#000000', font=('Orbitron', 14, 'bold')).pack()
    
    def open_ultima(self):
        self.clear_content()
        
        ultima_label = ttk.Label(self.content_area, text="ULTIMA Terminal", style='Title.TLabel')
        ultima_label.pack(pady=20)
        
        # Terminal area
        terminal_frame = ttk.Frame(self.content_area, style='Matrix.TFrame')
        terminal_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Output area
        self.terminal_output = tk.Text(terminal_frame, bg='#000000', fg='#00aaff',
                                     font=('Courier', 12, 'bold'), insertbackground='#00aaff',
                                     selectbackground='#003366')
        self.terminal_output.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Input area
        input_frame = ttk.Frame(terminal_frame, style='Matrix.TFrame')
        input_frame.pack(fill=tk.X)
        
        self.terminal_input = tk.Entry(input_frame, bg='#000000', fg='#ffffff',
                                     font=('Courier', 12, 'bold'), insertbackground='#00aaff',
                                     selectbackground='#003366', bd=2, relief='sunken')
        self.terminal_input.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.terminal_input.bind('<Return>', self.process_terminal_input)
        
        send_btn = ttk.Button(input_frame, text="Send", style='Cyber.TButton',
                            command=self.process_terminal_input)
        send_btn.pack(side=tk.RIGHT, padx=(10, 0))
        
        # Welcome message
        self.terminal_output.insert(tk.END, "ULTIMA Terminal Activated\n")
        self.terminal_output.insert(tk.END, "5-Layer DQN Reasoning Engine Online\n")
        self.terminal_output.insert(tk.END, "Type 'help' for commands\n\n")
    
    def process_terminal_input(self, event=None):
        command = self.terminal_input.get().strip()
        if command:
            self.terminal_output.insert(tk.END, f"> {command}\n")
            
            # Simple command processing
            if command.lower() == 'help':
                response = "Available commands: help, status, wallet, clear\n"
            elif command.lower() == 'status':
                response = "System Status: Online | DQN Layers: 5 | Wallet: Connected\n"
            elif command.lower() == 'wallet':
                if self.wallet_connected:
                    response = f"Wallet: {self.wallet_address}\nBalance: 2.45 SOL\n"
                else:
                    response = "No wallet connected\n"
            elif command.lower() == 'clear':
                self.terminal_output.delete(1.0, tk.END)
                response = ""
            else:
                response = f"Processing: {command}\nULTIMA neural networks analyzing...\n"
            
            if response:
                self.terminal_output.insert(tk.END, response + "\n")
            
            self.terminal_input.delete(0, tk.END)
            self.terminal_output.see(tk.END)
    
    def open_launchpad(self):
        self.clear_content()
        ttk.Label(self.content_area, text="Token Launchpad", style='Title.TLabel').pack(pady=20)
        ttk.Label(self.content_area, text="Create and deploy SPL tokens", style='Subtitle.TLabel').pack()
    
    def open_swap(self):
        self.clear_content()
        ttk.Label(self.content_area, text="Swap Interface", style='Title.TLabel').pack(pady=20)
        ttk.Label(self.content_area, text="Jupiter DEX integration", style='Subtitle.TLabel').pack()
    
    def open_portfolio(self):
        self.clear_content()
        ttk.Label(self.content_area, text="Portfolio", style='Title.TLabel').pack(pady=20)
        ttk.Label(self.content_area, text="Manage your assets", style='Subtitle.TLabel').pack()
    
    def open_analytics(self):
        self.clear_content()
        ttk.Label(self.content_area, text="Analytics", style='Title.TLabel').pack(pady=20)
        ttk.Label(self.content_area, text="Real-time market data", style='Subtitle.TLabel').pack()
    
    def open_staking(self):
        self.clear_content()
        ttk.Label(self.content_area, text="Staking", style='Title.TLabel').pack(pady=20)
        ttk.Label(self.content_area, text="Stake S-IO tokens", style='Subtitle.TLabel').pack()
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = SingularityApp()
    app.run()