import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';
import BasicModelForm from 'CommonUI/src/Components/Forms/BasicModelForm';
import User from 'Common/Models/User';
import FormValues from 'CommonUI/src/Components/Forms/Types/FormValues';
import Footer from '../Footer';

const SsoLoginPage: FunctionComponent = () => {
    const user: User = new User();

    return (
        <>
            <BasicModelForm<User>
                model={user}
                id="login-form"
                fields={[
                    {
                        field: {
                            email: true,
                        },
                        title: 'Email',
                    },
                ]}
                onSubmit={(values: FormValues<User>) => {
                    console.log(values);
                }}
                submitButtonText={'Continue with SSO'}
                title={'Sign in to your account'}
            >
                <div className="actions">
                    <p>
                        <Link to="/login">Use your password instead</Link>
                    </p>
                    <p>
                        <span>Don&apos;t have an account? </span>
                        <Link to="/register">Sign up</Link>
                    </p>
                </div>
            </BasicModelForm>
            <Footer />
        </>
    );
};

export default SsoLoginPage;
