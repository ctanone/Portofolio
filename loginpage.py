# Libraries
import tkinter as tk
import customtkinter
from PIL import ImageTk, Image

# Ui Settings
customtkinter.set_appearance_mode("system")  # Modes: "System" (standard), "Dark", "Light"
customtkinter.set_default_color_theme("dark-blue")
# Main Window settings
app = customtkinter.CTk()
app.geometry("400x500")
app.title("Login Page")
frame = customtkinter.CTkFrame(master=app, width=100, height=100)
frame.pack(pady=20, padx=60, fill="both", expand=True)
label = customtkinter.CTkLabel(master=frame, text="Login Page", font=("Arial", 24))
label.pack(pady=(100,100), padx=10)

# Load and set background image
username_entry = customtkinter.CTkEntry(master=frame, placeholder_text="Username", height=30, width=200)
username_entry.pack(pady=10, padx=10)
password_entry = customtkinter.CTkEntry(master=frame, placeholder_text="Password", show="*", height=30, width=200)
password_entry.pack(pady=10, padx=10)
button = customtkinter.CTkButton(master=frame, text="Login", height=30, width=100)
button.pack(pady= 5, padx=10)
button = customtkinter.CTkButton(master=frame, text="Google Authentication", height=30, width=100)
button.pack(pady= 30 ,padx=10)
#button._image = ImageTk.PhotoImage(Image.open("").resize((20, 20)))

# bg_image = ImageTk.PhotoImage(Image.open("background.jpg").resize((400, 500))

#button_image = ImageTk.PhotoImage(Image.open("login_icon.png").resize((100, 100)))
app.mainloop()