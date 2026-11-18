from flask_wtf import FlaskForm
from wtforms import (
    StringField, PasswordField, SelectField, TextAreaField,
    BooleanField, DateField, SubmitField
)
from wtforms.validators import (
    DataRequired, Email, Length, EqualTo, ValidationError, Optional, Regexp
)
from config import Config

class SignupForm(FlaskForm):
    """Instagram-style sign-up form with instant inline validation and strength feedback."""
    full_name = StringField('Full Name', validators=[
        DataRequired(message="Please provide your full legal name."),
        Length(min=2, max=80, message="Full name must be between 2 and 80 characters.")
    ])
    
    email = StringField('Email Address', validators=[
        DataRequired(message="Email address is required."),
        Email(message="Please enter a valid email address.")
    ])
    
    username = StringField('Username', validators=[
        DataRequired(message="Username is required."),
        Length(min=3, max=30, message="Username must be between 3 and 30 characters."),
        Regexp(r'^[a-zA-Z0-9_.]+$', message="Username may only contain letters, numbers, dots, and underscores.")
    ])
    
    password = PasswordField('Password', validators=[
        DataRequired(message="Password is required."),
        Length(min=8, message="Password must be at least 8 characters long.")
    ])
    
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message="Please confirm your password."),
        EqualTo('password', message="Passwords do not match.")
    ])
    
    subsystem = SelectField('Subsystem', choices=[], validators=[
        DataRequired(message="Please select your engineering subsystem.")
    ])
    
    role = SelectField('Team Role', choices=[], validators=[
        DataRequired(message="Please select your team role.")
    ])
    
    invite_code = StringField('Leadership Invite Code', validators=[
        Optional()
    ])

class LoginForm(FlaskForm):
    """Clean login form with lockout protection."""
    username = StringField('Username or Email', validators=[
        DataRequired(message="Please enter your username or registered email.")
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message="Password is required.")
    ])
    remember_me = BooleanField('Remember me on this pit terminal')
    submit = SubmitField('Log In')

class ForgotPasswordForm(FlaskForm):
    """Password reset request form."""
    email = StringField('Registered Email', validators=[
        DataRequired(message="Please enter your email address."),
        Email(message="Please enter a valid email address.")
    ])
    submit = SubmitField('Send Reset Link')

class ResetPasswordForm(FlaskForm):
    """Single-use token password reset form."""
    password = PasswordField('New Password', validators=[
        DataRequired(message="New password is required."),
        Length(min=8, message="Password must be at least 8 characters.")
    ])
    confirm_password = PasswordField('Confirm New Password', validators=[
        DataRequired(message="Please confirm your new password."),
        EqualTo('password', message="Passwords do not match.")
    ])
    submit = SubmitField('Update Password')

class TaskForm(FlaskForm):
    """Task creation and modification form for leadership."""
    title = StringField('Task Title', validators=[
        DataRequired(message="Task title is required."),
        Length(min=5, max=140, message="Title must be between 5 and 140 characters.")
    ])
    description = TextAreaField('Technical Specification / Instructions', validators=[
        Optional()
    ])
    subsystem = SelectField('Subsystem', choices=[], validators=[
        DataRequired(message="Please select the target subsystem.")
    ])
    assignee_id = SelectField('Assignee', coerce=int, validators=[
        DataRequired(message="Please assign this work to an engineer.")
    ])
    priority = SelectField('Priority', choices=[('Normal', 'Normal'), ('High', 'High')], validators=[
        DataRequired()
    ])
    due_date = DateField('Due Date', format='%Y-%m-%d', validators=[
        DataRequired(message="Due date is required.")
    ])
    status = SelectField('Status', choices=[('To Do', 'To Do'), ('In Progress', 'In Progress'), ('Done', 'Done')], default='To Do')
    notes = TextAreaField('Progress Notes / Log', validators=[Optional()])
    submit = SubmitField('Save Task')

class TaskStatusUpdateForm(FlaskForm):
    """Quick one-click task status update form for engineers and leads."""
    status = SelectField('Status', choices=[('To Do', 'To Do'), ('In Progress', 'In Progress'), ('Done', 'Done')])
    notes = TextAreaField('Update Notes (Optional)', validators=[Optional()])
    submit = SubmitField('Update Status')

class ProfileForm(FlaskForm):
    """User profile update form."""
    full_name = StringField('Full Name', validators=[
        DataRequired(),
        Length(min=2, max=80)
    ])
    email = StringField('Email Address', validators=[
        DataRequired(),
        Email()
    ])
    current_password = PasswordField('Current Password (Required for changes)', validators=[Optional()])
    new_password = PasswordField('New Password (Optional)', validators=[Optional(), Length(min=8)])
    confirm_new_password = PasswordField('Confirm New Password', validators=[
        Optional(),
        EqualTo('new_password', message="New passwords must match.")
    ])
    submit = SubmitField('Save Changes')
